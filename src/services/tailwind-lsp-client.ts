import { spawn } from 'node:child_process'
import { Logger } from '../utils/logger.js'

type LspMessage = { jsonrpc: '2.0'; id?: number; method?: string; params?: any; result?: any }

export class TailwindLspClient {
  private logger: Logger
  private proc: ReturnType<typeof spawn> | null = null
  private nextId = 1
  private pending = new Map<number, { resolve: (v: any) => void; reject: (e: any) => void }>()
  private buf = Buffer.alloc(0)
  private initialized = false
  private diagListeners = new Map<string, (diags: any[]) => void>()

  constructor(logger: Logger) {
    this.logger = logger
  }

  async start(): Promise<void> {
    if (this.proc) return
    const bin = require.resolve('@tailwindcss/language-server/bin/tailwindcss-language-server')
    this.proc = spawn(process.execPath, [bin, '--stdio'], { stdio: ['pipe', 'pipe', 'pipe'] })
    this.proc.stdout.on('data', (d) => this.onData(d))
    this.proc.stderr.on('data', () => {})
    this.proc.on('exit', () => { this.proc = null; this.initialized = false })
    await this.initialize()
  }

  async stop(): Promise<void> {
    if (!this.proc) return
    this.proc.kill()
    this.proc = null
    this.initialized = false
  }

  private write(msg: any) {
    const s = JSON.stringify(msg)
    const h = `Content-Length: ${Buffer.byteLength(s)}\r\n\r\n`
    this.proc?.stdin.write(h + s)
  }

  private onData(chunk: Buffer) {
    this.buf = Buffer.concat([this.buf, chunk])
    while (true) {
      const headerEnd = this.buf.indexOf('\r\n\r\n')
      if (headerEnd === -1) break
      const header = this.buf.slice(0, headerEnd).toString()
      const m = header.match(/Content-Length:\s*(\d+)/i)
      if (!m) { this.buf = this.buf.slice(headerEnd + 4); continue }
      const len = parseInt(m[1], 10)
      const start = headerEnd + 4
      if (this.buf.length < start + len) break
      const body = this.buf.slice(start, start + len).toString()
      this.buf = this.buf.slice(start + len)
      const msg: LspMessage = JSON.parse(body)
      this.onMessage(msg)
    }
  }

  private onMessage(msg: LspMessage) {
    if (typeof msg.id === 'number' && msg.result !== undefined) {
      const p = this.pending.get(msg.id)
      if (p) { this.pending.delete(msg.id); p.resolve(msg.result) }
      return
    }
    if (msg.method === 'textDocument/publishDiagnostics') {
      const uri = msg.params?.uri
      const diags = msg.params?.diagnostics || []
      const cb = this.diagListeners.get(uri)
      if (cb) cb(diags)
      return
    }
  }

  private request(method: string, params: any): Promise<any> {
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.write({ jsonrpc: '2.0', id, method, params })
    })
  }

  private notify(method: string, params: any) {
    this.write({ jsonrpc: '2.0', method, params })
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return
    const rootUri = null
    await this.request('initialize', {
      processId: process.pid,
      rootUri,
      capabilities: {},
      trace: 'off'
    })
    this.notify('initialized', {})
    this.initialized = true
  }

  async getCanonicalDiagnostics(text: string, uri: string, languageId: string): Promise<any[]> {
    await this.start()
    const diagsPromise = new Promise<any[]>((resolve) => {
      const cb = (d: any[]) => resolve(d)
      this.diagListeners.set(uri, cb)
      setTimeout(() => resolve([]), 1200)
    })
    this.notify('textDocument/didOpen', {
      textDocument: { uri, languageId, version: 1, text }
    })
    const diags = await diagsPromise
    this.diagListeners.delete(uri)
    this.notify('textDocument/didClose', { textDocument: { uri } })
    return diags
  }
}