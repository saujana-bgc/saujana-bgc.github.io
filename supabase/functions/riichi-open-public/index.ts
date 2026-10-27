import { bucket, eventSlug, hashText, options, reply, safeMessage, serviceClient } from '../_shared/riichi-open.ts'

const json = (value: unknown) => value && typeof value === 'object' ? value as Record<string, unknown> : {}
const acceptedMimes = new Set(['image/jpeg','image/png','application/pdf'])

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return options(request)
  if (request.method !== 'POST') return reply(request, 405, { error: 'Use POST for this request.' })
  try {
    const body = json(await request.json())
    const client = serviceClient()
    const { data: event, error: eventError } = await client.from('riichi_open_events').select('id,slug,name,event_date,start_time,timezone,venue,entry_fee_sen,capacity,registration_hold_minutes,registration_open,stage,updated_at,current_publication_id').eq('slug', eventSlug).single()
    if (eventError || !event) throw new Error('Event details are temporarily unavailable.')

    if (body.action === 'summary') {
      const [{ data: registrations, error }, { count: holds, error: holdError }] = await Promise.all([
        client.from('riichi_open_registrations').select('id,event_id,display_name,status,submitted_at').eq('event_id', event.id).in('status',['pending','verified','needs_clarification']).order('submitted_at'),
        client.from('riichi_open_registration_holds').select('id',{count:'exact',head:true}).eq('event_id',event.id).eq('status','active').gt('expires_at',new Date().toISOString()),
      ])
      if (error || holdError) throw error ?? holdError
      const publication = event.current_publication_id
        ? await client.from('riichi_open_publications').select('id,version,snapshot,created_at').eq('id',event.current_publication_id).maybeSingle()
        : { data: null, error: null }
      if (publication.error) throw publication.error
      return reply(request,200,{event,registrations:registrations??[],active_holds:holds??0,publication:publication.data})
    }

    if (body.action === 'reserve') {
      const token = String(body.token ?? '')
      const idem = String(body.idempotency_key ?? '')
      if (token.length < 40 || token.length > 120 || idem.length < 20 || idem.length > 100) return reply(request,400,{error:'Refresh the page and try again.'})
      const forwarded = request.headers.get('cf-connecting-ip') ?? request.headers.get('x-real-ip') ?? request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() ?? ''
      if (!forwarded || forwarded.length > 64 || !/^[0-9a-f:.]+$/i.test(forwarded)) return reply(request,400,{error:'Your network address could not be checked. Please try again.'})
      const clientFingerprint = await hashText(forwarded.toLowerCase())
      const { data, error } = await client.rpc('reserve_riichi_open_place',{p_token_hash:await hashText(token),p_idempotency_key:idem,p_client_fingerprint:clientFingerprint})
      if (error?.message.toLowerCase().includes('reservation rate limit')) return reply(request,429,{error:'Too many places have been reserved from this network. Please wait 30 minutes before trying again.'})
      if (error) throw new Error(error.message.includes('All places') ? 'All 16 places are currently reserved.' : error.message)
      const hold = data as {id:string;expires_at:string}
      const { data: completed } = await client.from('riichi_open_registrations').select('id,status').eq('hold_id',hold.id).maybeSingle()
      if (completed) return reply(request,200,{completed:true,id:hold.id,registration_id:completed.id,status:completed.status,reference:completed.id.slice(0,8).toUpperCase()})
      const path = String((data as {receipt_path:string}).receipt_path)
      return reply(request,200,{id:hold.id,expires_at:hold.expires_at,path,completed:false})
    }

    if (body.action === 'restart') {
      const registrationId = String(body.registration_id ?? '')
      const previousToken = String(body.previous_token ?? '')
      const token = String(body.token ?? '')
      const idem = String(body.idempotency_key ?? '')
      if (!/^[0-9a-f-]{36}$/i.test(registrationId) || token.length < 40 || token.length > 120 ||
          previousToken.length < 40 || previousToken.length > 120 || idem.length < 20 || idem.length > 100) {
        return reply(request,400,{error:'Refresh this page and try again.'})
      }
      const forwarded = request.headers.get('cf-connecting-ip') ?? request.headers.get('x-real-ip') ?? request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() ?? ''
      if (!forwarded || forwarded.length > 64 || !/^[0-9a-f:.]+$/i.test(forwarded)) return reply(request,400,{error:'Your network address could not be checked. Please try again.'})
      const clientFingerprint = await hashText(forwarded.toLowerCase())
      const {data,error}=await client.rpc('restart_cancelled_riichi_open_registration',{
        p_registration_id:registrationId,
        p_previous_token_hash:await hashText(previousToken),
        p_new_token_hash:await hashText(token),
        p_idempotency_key:idem,
        p_client_fingerprint:clientFingerprint,
      })
      if(error?.message.toLowerCase().includes('reservation rate limit')) return reply(request,429,{error:'Too many places have been reserved from this network. Please wait 30 minutes before trying again.'})
      if(error) throw new Error(error.message)
      return reply(request,200,data)
    }

    if (body.action === 'receipt_upload_url') {
      const holdId = String(body.hold_id ?? '')
      const token = String(body.token ?? '')
      const mime = String(body.mime_type ?? '')
      const size = Number(body.size)
      if (!acceptedMimes.has(mime) || !Number.isInteger(size) || size < 1 || size > 5242880) {
        return reply(request,400,{error:'Choose a JPG, PNG or PDF receipt no larger than 5 MB.'})
      }
      const { data: ownedHold, error: holdError } = await client.from('riichi_open_registration_holds')
        .select('token_hash,status').eq('id',holdId).eq('event_id',event.id).maybeSingle()
      if (holdError) throw holdError
      if (!ownedHold || ownedHold.token_hash !== await hashText(token)) {
        return reply(request,400,{error:'This registration session could not be confirmed.'})
      }
      const { data: completed, error: registrationError } = await client.from('riichi_open_registrations')
        .select('id,status,submitted_at').eq('hold_id',holdId).maybeSingle()
      if (registrationError) throw registrationError
      if (completed) return reply(request,200,{completed:true,...completed,reference:completed.id.slice(0,8).toUpperCase()})
      if (!['active','expired'].includes(ownedHold.status)) {
        return reply(request,409,{error:'This reservation has already been submitted or released.'})
      }

      const path = `${event.id}/${holdId}/${crypto.randomUUID()}`
      const { error: pathError } = await client.from('riichi_open_registration_holds')
        .update({receipt_path:path}).eq('id',holdId).in('status',['active','expired'])
      if (pathError) throw pathError
      const { data: grant, error: grantError } = await client.storage.from(bucket).createSignedUploadUrl(path,{upsert:false})
      if (grantError || !grant) throw grantError ?? new Error('Secure receipt upload is unavailable.')
      return reply(request,200,{path,signed_url:grant.signedUrl,upload_token:grant.token})
    }

    if (body.action === 'finalize') {
      const holdId = String(body.hold_id ?? '')
      const token = String(body.token ?? '')
      const path = String(body.path ?? '')
      const mime = String(body.mime_type ?? '')
      const size = Number(body.size)
      if (!acceptedMimes.has(mime) || !Number.isInteger(size) || size<1 || size>5242880 || !path.startsWith(`${event.id}/${holdId}/`)) return reply(request,400,{error:'The receipt details are invalid. Please choose an accepted file.'})
      const { data: ownedHold } = await client.from('riichi_open_registration_holds').select('token_hash').eq('id',holdId).eq('event_id',event.id).maybeSingle()
      if (!ownedHold || ownedHold.token_hash !== await hashText(token)) return reply(request,400,{error:'This registration session could not be confirmed.'})
      const { data: existing } = await client.from('riichi_open_registrations').select('id,status,submitted_at').eq('hold_id',holdId).maybeSingle()
      if (existing) return reply(request,200,{...existing,reference:existing.id.slice(0,8).toUpperCase()})
      const folder = `${event.id}/${holdId}`
      const { data: files, error: listError } = await client.storage.from(bucket).list(folder,{search:path.split('/').pop(),limit:5})
      if (listError) throw new Error('The receipt could not be confirmed in storage.')
      const object = files?.find((file) => `${folder}/${file.name}`===path)
      if (!object || Number(object.metadata?.size ?? object.metadata?.contentLength ?? size)!==size) throw new Error('Upload the payment receipt before submitting.')
      const { data: receiptFile, error: downloadError } = await client.storage.from(bucket).download(path)
      if (downloadError || !receiptFile) throw new Error('The receipt could not be checked in storage.')
      if (receiptFile.size !== size || receiptFile.size > 5242880) throw new Error('The uploaded file size does not match the receipt details.')
      const head = new Uint8Array(await receiptFile.slice(0,8).arrayBuffer())
      const isJpeg = head[0]===0xff&&head[1]===0xd8&&head[2]===0xff
      const isPng = head[0]===0x89&&head[1]===0x50&&head[2]===0x4e&&head[3]===0x47&&head[4]===0x0d&&head[5]===0x0a&&head[6]===0x1a&&head[7]===0x0a
      const isPdf = new TextDecoder().decode(head.slice(0,5))==='%PDF-'
      if ((mime==='image/jpeg'&&!isJpeg)||(mime==='image/png'&&!isPng)||(mime==='application/pdf'&&!isPdf)) throw new Error('The file contents do not match the selected receipt type.')
      const digest=await crypto.subtle.digest('SHA-256',await receiptFile.arrayBuffer())
      const sha256=[...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('')
      const { data, error } = await client.rpc('finalize_riichi_open_registration',{
        p_hold_id:holdId,p_token_hash:await hashText(token),p_display_name:String(body.display_name??''),p_receipt_path:path,p_receipt_mime:mime,p_receipt_size:size,p_receipt_sha256:sha256,
      })
      if (error) throw new Error(error.message)
      return reply(request,200,{...data,reference:String((data as {id:string}).id).slice(0,8).toUpperCase()})
    }

    if (body.action === 'registration_status') {
      const holdId=String(body.hold_id??''),token=String(body.token??'')
      const {data:ownedHold,error:holdError}=await client.from('riichi_open_registration_holds')
        .select('token_hash').eq('id',holdId).eq('event_id',event.id).maybeSingle()
      if(holdError) throw holdError
      if(!ownedHold||ownedHold.token_hash!==await hashText(token)) return reply(request,400,{error:'This registration session could not be confirmed.'})
      const {data:registration,error:registrationError}=await client.from('riichi_open_registrations')
        .select('id,display_name,status,submitted_at').eq('hold_id',holdId).maybeSingle()
      if(registrationError) throw registrationError
      if(!registration) return reply(request,404,{error:'No submitted registration was found for this reservation.'})
      return reply(request,200,{...registration,reference:registration.id.slice(0,8).toUpperCase()})
    }

    if (body.action === 'cancel') {
      const holdId=String(body.hold_id??''),token=String(body.token??'')
      const {data:ownedHold}=await client.from('riichi_open_registration_holds').select('token_hash,receipt_path,status').eq('id',holdId).eq('event_id',event.id).maybeSingle()
      if(!ownedHold||ownedHold.token_hash!==await hashText(token)) return reply(request,400,{error:'This registration session could not be confirmed.'})
      if(ownedHold.status==='cancelled') return reply(request,200,{ok:true})
      if(ownedHold.status==='submitted') return reply(request,409,{error:'This reservation has already been submitted and cannot be released.'})
      if(ownedHold.receipt_path){
        const folder=ownedHold.receipt_path.split('/').slice(0,2).join('/')
        const filename=ownedHold.receipt_path.split('/').pop()
        const {data:files,error}=await client.storage.from(bucket).list(folder,{search:filename,limit:100})
        if(error) throw error
        if(files?.some(file=>`${folder}/${file.name}`===ownedHold.receipt_path)) return reply(request,409,{error:'A receipt has already been uploaded. Submit it for review instead of releasing this place.'})
      }
      const {error}=await client.rpc('cancel_riichi_open_place',{p_hold_id:holdId,p_token_hash:ownedHold.token_hash})
      if(error) throw error
      return reply(request,200,{ok:true})
    }

    return reply(request,400,{error:'Unknown registration action.'})
  } catch (error) { return reply(request,400,{error:safeMessage(error)}) }
})
