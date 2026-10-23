import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const conf = readFileSync(join(__dirname, '..', 'nginx', 'alas.conf'), 'utf8')

/** Isi blok `location <path> { ... }` pertama yang cocok persis dengan path. */
function locationBlock(path: string): string {
  const start = conf.indexOf(`location ${path} {`)
  if (start === -1) throw new Error(`location ${path} tidak ditemukan`)
  let depth = 0
  for (let i = conf.indexOf('{', start); i < conf.length; i++) {
    if (conf[i] === '{') depth++
    if (conf[i] === '}' && --depth === 0) return conf.slice(start, i + 1)
  }
  throw new Error('blok tidak seimbang')
}

function zoneRate(zone: string): number {
  const match = conf.match(new RegExp(`limit_req_zone\\s+\\$binary_remote_addr\\s+zone=${zone}:\\S+\\s+rate=(\\d+)r/m`))
  if (!match) throw new Error(`zone ${zone} tidak ditemukan`)
  return Number(match[1])
}

describe('batas laju nginx (ADR-0012)', () => {
  it('API publik tetap paling ketat', () => {
    expect(zoneRate('api_limit')).toBe(100)
    expect(locationBlock('/api/')).toContain('limit_req zone=api_limit')
  })

  it('Service API Lawet Hub memakai zona sendiri yang jauh lebih longgar', () => {
    expect(zoneRate('service_limit')).toBeGreaterThanOrEqual(600)
    const block = locationBlock('/api/service/')
    expect(block).toContain('limit_req zone=service_limit')
    expect(block).not.toContain('zone=api_limit')
    expect(block).toContain('proxy_pass http://alas-app:3000')
  })

  it('proxy media panel memakai zona sendiri agar halaman dengan banyak foto tidak terkena batas API publik', () => {
    expect(zoneRate('media_limit')).toBeGreaterThan(zoneRate('api_limit'))
    const block = locationBlock('/api/v1/jurnal-alas/media/')
    expect(block).toContain('limit_req zone=media_limit')
    expect(block).toContain('proxy_pass http://alas-app:3000')
  })

  it('melebihi batas dijawab 429 agar pengirim dapat membedakannya dari galat server', () => {
    expect(conf).toMatch(/limit_req_status\s+429;/)
  })

  it('rute mock pengujian tetap 404 dan header proxy diteruskan di setiap lokasi', () => {
    expect(locationBlock('/api/mock/')).toContain('return 404')
    for (const path of ['/api/service/', '/api/v1/jurnal-alas/media/', '/api/']) {
      const block = locationBlock(path)
      expect(block).toContain('proxy_set_header X-Forwarded-Proto $scheme')
      expect(block).toContain('proxy_set_header Host $http_host')
    }
  })
})
