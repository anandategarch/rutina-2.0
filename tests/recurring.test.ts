/* ============================================================
 * Pengujian otomatis — transaksi berulang (store.materializeRecurring)
 * v2.16 (audit T5-e #5): salinan terbaru yang dihapus tidak boleh
 * dihidupkan ulang oleh materialisasi berikutnya.
 * Jalankan: bun test
 * ============================================================ */

import { describe, expect, test } from 'bun:test'

import {
  addMonthsISO,
  todayISO,
  useRutina,
  type Tx,
} from '../src/components/rutina-mobile/store'

function template(id: string, ts: string): Tx {
  return {
    id,
    type: 'keluar',
    cat: 'hiburan',
    amount: 54_000,
    note: 'Langganan',
    ts,
    recurrence: 'bulanan',
  }
}

describe('materializeRecurring — anti-resurreksi (audit T5-e #5)', () => {
  test('menghapus salinan terbaru tidak membangkitkan ulang tanggal yang sama', () => {
    const today = todayISO()
    const start = addMonthsISO(today, -3)
    useRutina.setState({ txs: [template('tpl-1', start)] })

    /* Materialisasi #1: salinan pada start+1, start+2, start+3. */
    useRutina.getState().materializeRecurring()
    let txs = useRutina.getState().txs
    let copies = txs.filter((t) => t.recurOf === 'tpl-1')
    expect(copies.length).toBe(3)
    expect(copies.map((t) => t.ts).sort()).toEqual(
      [addMonthsISO(start, 1), addMonthsISO(start, 2), addMonthsISO(start, 3)].sort(),
    )
    /* ts templat dimajukan ke due terakhir yang direncanakan. */
    const tpl = txs.find((t) => t.id === 'tpl-1')
    expect(tpl?.ts).toBe(addMonthsISO(start, 3))

    /* Hapus salinan TERBARU → tanggal itu tidak boleh lahir kembali. */
    const newest = copies.reduce((a, b) => (a.ts > b.ts ? a : b))
    useRutina.getState().deleteTx(newest.id)
    useRutina.getState().materializeRecurring()
    txs = useRutina.getState().txs
    copies = txs.filter((t) => t.recurOf === 'tpl-1')
    expect(copies.length).toBe(2) // start+1 & start+2 — start+3 tetap terhapus
    expect(copies.some((t) => t.ts === newest.ts)).toBe(false)
    /* Salinan berikutnya (bila jadwalnya tiba) melanjutkan SETELAH
       tanggal terhapus — seri tidak putus, tidak dobel. */
  })

  test('templat menghasilkan satu salinan per periode (tanpa duplikat tanggal)', () => {
    const today = todayISO()
    const start = addMonthsISO(today, -2)
    useRutina.setState({ txs: [template('tpl-2', start)] })
    useRutina.getState().materializeRecurring()
    const txs = useRutina.getState().txs
    const dates = txs.filter((t) => t.recurOf === 'tpl-2').map((t) => t.ts)
    expect(new Set(dates).size).toBe(dates.length)
    expect(dates.length).toBe(2)
  })

  test('materialisasi ulang tanpa jadwal baru tidak menambah apa pun', () => {
    const today = todayISO()
    const start = addMonthsISO(today, -1)
    useRutina.setState({ txs: [template('tpl-3', start)] })
    useRutina.getState().materializeRecurring()
    const afterFirst = useRutina.getState().txs.length
    useRutina.getState().materializeRecurring()
    expect(useRutina.getState().txs.length).toBe(afterFirst)
  })
})
