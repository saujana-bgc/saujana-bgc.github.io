import { adminUser, bucket, eventSlug, options, reply, safeMessage, serviceClient } from '../_shared/riichi-open.ts'

const object = (value: unknown) => value && typeof value === 'object' ? value as Record<string, unknown> : {}
const fail = (message: string): never => { throw new Error(message) }

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return options(request)
  if (request.method !== 'POST') return reply(request,405,{error:'Use POST for this request.'})
  try {
    const body = object(await request.json())
    const client = serviceClient()
    const user = await adminUser(request,client)
    const {data:event,error:eventError}=await client.from('riichi_open_events').select('*').eq('slug',eventSlug).single()
    if(eventError||!event) throw new Error('Event details could not be loaded.')

    if(body.action==='overview'){
      const [registrations,participants,rounds,tables,audit,holds]=await Promise.all([
        client.from('riichi_open_registrations').select('*').eq('event_id',event.id).order('submitted_at',{ascending:false}),
        client.from('riichi_open_participants').select('*').eq('event_id',event.id).order('created_at'),
        // Rounds do not have created_at; their key is the stable identifier.
        client.from('riichi_open_rounds').select('*').eq('event_id',event.id).order('round_key'),
        client.from('riichi_open_tables').select('*').eq('event_id',event.id).order('table_number'),
        client.from('riichi_open_audit_log').select('*').eq('event_id',event.id).order('created_at',{ascending:false}).limit(100),
        client.from('riichi_open_registration_holds').select('id',{count:'exact',head:true}).eq('event_id',event.id).eq('status','active').gt('expires_at',new Date().toISOString()),
      ])
      for(const result of [registrations,participants,rounds,tables,audit,holds]) if(result.error) throw result.error
      const roundOrder:Record<string,number>={qualifier_1:0,qualifier_2:1,final:2}
      const orderedRounds=[...(rounds.data??[])].sort((a,b)=>(roundOrder[a.round_key]??99)-(roundOrder[b.round_key]??99))
      const ids=orderedRounds.map(row=>row.id)
      const [seats,results,penalties]=ids.length?await Promise.all([
        client.from('riichi_open_seats').select('*').in('round_id',ids),
        client.from('riichi_open_results').select('*').in('round_id',ids),
        client.from('riichi_open_penalties').select('*').in('round_id',ids),
      ]):[{data:[],error:null},{data:[],error:null},{data:[],error:null}]
      if(seats.error||results.error||penalties.error) throw seats.error||results.error||penalties.error
      return reply(request,200,{event,registrations:registrations.data,participants:participants.data,rounds:orderedRounds,tables:tables.data,seats:seats.data,results:results.data,penalties:penalties.data,audit:audit.data,active_holds:holds.count??0})
    }

    if(body.action==='receipt_url'){
      const path=String(body.path??'')
      if(!path.startsWith(`${event.id}/`)) return reply(request,400,{error:'Receipt path is invalid.'})
      const {data,error}=await client.storage.from(bucket).createSignedUrl(path,90,{download:false})
      if(error||!data) throw error??new Error('Receipt preview is unavailable.')
      return reply(request,200,{url:data.signedUrl,expires_in:90})
    }

    if(body.action==='registration_status'){
      if(event.stage!=='registration') return reply(request,409,{error:'Payment status is locked after the playing roster starts.'})
      const id=String(body.registration_id??''),status=String(body.status??''),note=String(body.private_note??'').slice(0,2000)
      if(!['verified','needs_clarification','rejected','cancelled'].includes(status)) return reply(request,400,{error:'Choose a valid payment status.'})
      if(status==='verified'&&body.manual_verification===true&&note.trim().length<4) return reply(request,400,{error:'Add a short reason for manual payment verification.'})
      const {data:before,error:findError}=await client.from('riichi_open_registrations').select('id,display_name,status,receipt_path').eq('id',id).eq('event_id',event.id).single()
      if(findError||!before) return reply(request,404,{error:'Registration not found.'})
      if(status==='verified'&&!before.receipt_path&&body.manual_verification!==true) return reply(request,400,{error:'A private reason is required to verify payment without a receipt.'})
      const {error}=await client.rpc('admin_set_riichi_open_registration_status',{p_registration_id:id,p_status:status,p_note:note,p_actor:user.id})
      if(error) throw error
      return reply(request,200,{ok:true})
    }

    if(body.action==='add_participant'){
      const {data,error}=await client.rpc('admin_add_riichi_open_participant',{p_name:String(body.name??''),p_payment_verified:body.payment_verified===true,p_reason:String(body.reason??''),p_actor:user.id})
      if(error) throw error
      return reply(request,200,{participant_id:data})
    }

    if(body.action==='participant_update'){
      if(event.stage!=='registration') return reply(request,409,{error:'The playing roster is locked. Participant changes are no longer available.'})
      const id=String(body.participant_id??'')
      const patch:Record<string,unknown>={}
      if(typeof body.display_name==='string'){
        const name=body.display_name.trim()
        if(!name||name.length>80) return reply(request,400,{error:'Enter a name of up to 80 characters.'})
        patch.display_name=name
        const {data:participant}=await client.from('riichi_open_participants').select('registration_id').eq('id',id).eq('event_id',event.id).single()
        if(participant?.registration_id) await client.from('riichi_open_registrations').update({display_name:name,updated_at:new Date().toISOString()}).eq('id',participant.registration_id)
      }
      for(const key of ['checked_in','active','is_substitute','eligible_for_final']) if(typeof body[key]==='boolean') patch[key]=body[key]
      if(patch.is_substitute===true) patch.eligible_for_final=false
      const {error}=await client.from('riichi_open_participants').update(patch).eq('id',id).eq('event_id',event.id)
      if(error) throw error
      await client.from('riichi_open_audit_log').insert({event_id:event.id,actor_id:user.id,action:'update_participant',entity_type:'participant',entity_id:id,reason:String(body.reason??'').slice(0,500)||null,details:patch})
      return reply(request,200,{ok:true})
    }

    if(body.action==='registration_open'){
      const open=body.open===true
      if(open&&event.stage!=='registration') return reply(request,409,{error:'Registration cannot reopen after the playing roster starts.'})
      const {error}=await client.from('riichi_open_events').update({registration_open:open,updated_at:new Date().toISOString()}).eq('id',event.id)
      if(error) throw error
      await client.from('riichi_open_audit_log').insert({event_id:event.id,actor_id:user.id,action:open?'open_registration':'close_registration',entity_type:'event',entity_id:event.id})
      return reply(request,200,{ok:true})
    }

    if(body.action==='generate_q1'){
      const {data,error}=await client.rpc('admin_generate_riichi_open_q1',{p_actor:user.id})
      if(error) throw error
      const publication=await client.rpc('publish_riichi_open_assignments',{p_round_id:(data as {round_id:string}).round_id,p_actor:user.id})
      if(publication.error) throw publication.error
      return reply(request,200,data)
    }

    if(body.action==='prepare_round'){
      const roundKey=String(body.round_key??'')
      const {data,error}=await client.rpc('admin_prepare_riichi_open_round',{p_round_key:roundKey,p_actor:user.id})
      if(error) throw error
      const publication=await client.rpc('publish_riichi_open_assignments',{p_round_id:(data as {round_id:string}).round_id,p_actor:user.id})
      if(publication.error) throw publication.error
      return reply(request,200,data)
    }

    if(body.action==='record_tie_draw'){
      const roundId=String(body.round_id??''),participantIds=Array.isArray(body.participant_ids)?body.participant_ids.map(String):[],orderIds=Array.isArray(body.order_ids)?body.order_ids.map(String):[],note=String(body.public_note??'').slice(0,500)
      const {error}=await client.rpc('admin_record_riichi_open_tie_draw',{p_round_id:roundId,p_participant_ids:participantIds,p_order_ids:orderIds,p_note:note,p_actor:user.id})
      if(error) throw error
      return reply(request,200,{ok:true})
    }

    if(body.action==='save_table'){
      const {data,error}=await client.rpc('save_riichi_open_table_results',{
        p_round_id:String(body.round_id),p_table_id:String(body.table_id),p_revision:Number(body.revision),p_sticks:Number(body.unclaimed_sticks??0),p_results:body.results,p_actor:user.id,
      })
      if(error) throw error
      return reply(request,200,{draft_revision:data})
    }

    if(body.action==='penalty'){
      const roundId=String(body.round_id??''),participantId=String(body.participant_id??''),points=Number(body.points),reason=String(body.reason??'').trim()
      if(!Number.isFinite(points)||points<0||points>9999||!reason||reason.length>500) return reply(request,400,{error:'Enter a penalty amount and reason.'})
      const {data:round,error:roundError}=await client.from('riichi_open_rounds').select('id,round_key,status').eq('id',roundId).eq('event_id',event.id).single()
      if(roundError||!round||round.status==='certified') return reply(request,400,{error:'This round cannot accept a penalty.'})
      const {data,error}=await client.rpc('admin_record_riichi_open_penalty',{p_round_id:roundId,p_participant_id:participantId,p_points:points,p_reason:reason,p_revision:Number(body.revision),p_actor:user.id})
      if(error) throw error
      return reply(request,200,{draft_revision:data})
    }

    if(body.action==='certify_round'){
      const {data,error}=await client.rpc('admin_certify_riichi_open_round',{p_round_id:String(body.round_id),p_revision:Number(body.revision),p_actor:user.id})
      if(error) throw error
      return reply(request,200,data)
    }

    if(body.action==='export'){
      const [registrations,participants,results]=await Promise.all([
        client.from('riichi_open_registrations').select('display_name,status,submitted_at,verified_at').eq('event_id',event.id),
        client.from('riichi_open_participants').select('display_name,checked_in,active,is_substitute,eligible_for_final').eq('event_id',event.id),
        client.from('riichi_open_results').select('round_id,table_id,participant_id,raw_points,placement,uma,score').eq('event_id',event.id),
      ])
      if(registrations.error||participants.error||results.error) throw registrations.error||participants.error||results.error
      return reply(request,200,{registrations:registrations.data,participants:participants.data,results:results.data})
    }

    return reply(request,400,{error:'Unknown organiser action.'})
  } catch(error){
    const message=safeMessage(error)
    return reply(request,message.includes('access')||message.includes('Sign in')?401:400,{error:message})
  }
})
