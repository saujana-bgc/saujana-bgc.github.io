let _client = null

function parseCount(contentRange) {
    if (!contentRange) return null
    const count = contentRange.split('/').pop()
    return count && count !== '*' ? Number(count) : null
}

function buildQuery(params) {
    const query = new URLSearchParams()
    for (const [key, value] of params) query.append(key, value)
    return query.toString()
}

class SupabaseRestQuery {
    constructor(client, table) {
        this.client = client
        this.table = table
        this.method = 'GET'
        this.params = []
        this.headers = {}
        this.body = null
        this.isHead = false
    }

    select(columns = '*', options = {}) {
        if (this.method === 'GET') this.method = options.head ? 'HEAD' : 'GET'
        this.isHead = Boolean(options.head)
        this.params.push(['select', columns])
        if (options.count) {
            this.headers.Prefer = `count=${options.count}`
        } else if (this.method !== 'GET' && this.method !== 'HEAD') {
            this.headers.Prefer = 'return=representation'
        }
        return this
    }

    insert(payload) {
        this.method = 'POST'
        this.body = payload
        this.headers.Prefer = 'return=minimal'
        return this
    }

    update(payload) {
        this.method = 'PATCH'
        this.body = payload
        this.headers.Prefer = 'return=minimal'
        return this
    }

    delete() {
        this.method = 'DELETE'
        this.headers.Prefer = 'return=minimal'
        return this
    }

    order(column, options = {}) {
        this.params.push(['order', `${column}.${options.ascending === false ? 'desc' : 'asc'}`])
        return this
    }

    range(from, to) {
        this.headers['Range-Unit'] = 'items'
        this.headers.Range = `${from}-${to}`
        return this
    }

    eq(column, value) {
        this.params.push([column, `eq.${value}`])
        return this
    }

    gte(column, value) {
        this.params.push([column, `gte.${value}`])
        return this
    }

    lt(column, value) {
        this.params.push([column, `lt.${value}`])
        return this
    }

    in(column, values) {
        if (!values?.length) return this
        this.params.push([column, `in.(${values.join(',')})`])
        return this
    }

    single() {
        this.headers.Accept = 'application/vnd.pgrst.object+json'
        return this
    }

    then(resolve, reject) {
        return this.execute().then(resolve, reject)
    }

    async execute() {
        const query = buildQuery(this.params)
        const url = `${this.client.restUrl}/${this.table}${query ? `?${query}` : ''}`
        return this.client.request(url, {
            method: this.method,
            headers: this.headers,
            body: this.body ? JSON.stringify(this.body) : undefined,
            isHead: this.isHead,
        })
    }
}

class SupabaseRestClient {
    constructor(url, key) {
        this.baseUrl = url.replace(/\/$/, '')
        this.restUrl = `${this.baseUrl}/rest/v1`
        this.headers = {
            apikey: key,
            Authorization: `Bearer ${key}`,
        }
    }

    from(table) {
        return new SupabaseRestQuery(this, table)
    }

    rpc(name, payload) {
        return this.request(`${this.restUrl}/rpc/${name}`, {
            method: 'POST',
            body: payload ? JSON.stringify(payload) : undefined,
        })
    }

    /** Uploads a file to Supabase Storage without exposing a public URL. */
    async uploadFile(bucket, path, file) {
        try {
            const res = await fetch(`${this.baseUrl}/storage/v1/object/${bucket}/${path}`, {
                method: 'POST',
                headers: {
                    ...this.headers,
                    'Content-Type': file.type || 'application/octet-stream',
                    'x-upsert': 'false',
                },
                body: file,
            })

            if (!res.ok) return { data: null, error: await res.text() }
            return { data: await res.json(), error: null }
        } catch (error) {
            return { data: null, error }
        }
    }

    async request(url, options = {}) {
        try {
            const res = await fetch(url, {
                method: options.method ?? 'GET',
                headers: {
                    ...this.headers,
                    ...options.headers,
                    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
                },
                body: options.body,
            })

            if (!res.ok) {
                return { data: null, error: await res.text(), count: null }
            }

            const count = parseCount(res.headers.get('content-range'))
            if (options.isHead || res.status === 204) return { data: null, error: null, count }

            const text = await res.text()
            return { data: text ? JSON.parse(text) : null, error: null, count }
        } catch (error) {
            return { data: null, error, count: null }
        }
    }
}

export function useSupabase() {
    if (!_client) {
        const config = useRuntimeConfig()
        _client = new SupabaseRestClient(config.public.supabaseUrl, config.public.supabaseKey)
    }
    return _client
}
