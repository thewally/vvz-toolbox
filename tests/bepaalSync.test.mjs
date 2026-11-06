// Tests voor bepaalSync in src/services/teamImport.js (kaart thewally/ontwikkelstraat#37).
// Draaien met: node --test tests/bepaalSync.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bepaalSync } from '../src/services/teamImport.js'

const rij = (o) => ({ teamcode: 1, teamnaam: "VVZ '49 O13-1", geslacht: 'man', leeftijdscategorie: 'Onder 13', speeldag: 'Zaterdag', competitiesoort: 'regulier', ...o })

test('nieuw SportLink-team wordt toegevoegd met naam en categorie', () => {
  const r = bepaalSync([rij()], [])
  assert.deepEqual(r.toevoegen, [{ teamcode: '1', name: 'JO13-1', category: 'Junioren' }])
  assert.deepEqual(r.koppelen, [])
  assert.deepEqual(r.verdwenen, [])
})

test('team dat al op teamcode gekoppeld is blijft ongemoeid, ook na hernoemen', () => {
  const bestaand = [{ id: 'a', name: 'Mijn eigen naam', category: 'Senioren', bron: 'sportlink', sportlink_teamcode: '1' }]
  const r = bepaalSync([rij()], bestaand)
  assert.deepEqual(r, { toevoegen: [], koppelen: [], verdwenen: [] })
})

test('ongekoppeld team met dezelfde genormaliseerde naam wordt gekoppeld, id blijft', () => {
  const r = bepaalSync([rij()], [{ id: 'x', name: 'jo 13-1', bron: 'handmatig', sportlink_teamcode: null }])
  assert.deepEqual(r.koppelen, [{ id: 'x', teamcode: '1' }])
  assert.deepEqual(r.toevoegen, [])
})

test('extra (handmatig) team komt nooit in verdwenen', () => {
  const r = bepaalSync([rij()], [{ id: 'v', name: 'Veteranen', bron: 'handmatig', sportlink_teamcode: null }])
  assert.deepEqual(r.verdwenen, [])
  assert.equal(r.toevoegen.length, 1)
})

test('sportlink-team waarvan de teamcode verdwenen is wordt gemarkeerd', () => {
  const bestaand = [
    { id: 'a', name: 'JO13-1', bron: 'sportlink', sportlink_teamcode: '1' },
    { id: 'b', name: 'JO12-1', bron: 'sportlink', sportlink_teamcode: '2' },
  ]
  assert.deepEqual(bepaalSync([rij()], bestaand).verdwenen, ['b'])
})

test('teamcode als getal of tekst telt hetzelfde', () => {
  const bestaand = [{ id: 'a', name: 'JO13-1', bron: 'sportlink', sportlink_teamcode: '1' }]
  assert.deepEqual(bepaalSync([rij({ teamcode: 1 })], bestaand).verdwenen, [])
})

test('leeg of ongeldig antwoord verandert niets en markeert niets', () => {
  const bestaand = [{ id: 'a', name: 'JO13-1', bron: 'sportlink', sportlink_teamcode: '1' }]
  const leeg = { toevoegen: [], koppelen: [], verdwenen: [] }
  assert.deepEqual(bepaalSync([], bestaand), leeg)
  assert.deepEqual(bepaalSync(null, bestaand), leeg)
  assert.deepEqual(bepaalSync({ fout: true }, bestaand), leeg)
  assert.deepEqual(bepaalSync([{ teamnaam: 'zonder code' }], bestaand), leeg)
})

test('competitie- en bekerrij geven een team; dubbele namen geven geen dubbel team', () => {
  const r = bepaalSync([rij(), rij({ competitiesoort: 'beker' }), rij({ teamcode: 2 })], [])
  assert.equal(r.toevoegen.length, 1)
})

test('SportLink-team met naam van een al gekoppeld team wordt niet dubbel toegevoegd', () => {
  const bestaand = [{ id: 'a', name: 'JO13-1', bron: 'sportlink', sportlink_teamcode: '9' }]
  const r = bepaalSync([rij({ teamcode: 1 }), rij({ teamcode: 9, teamnaam: "VVZ '49 O12-1" })], bestaand)
  assert.deepEqual(r.toevoegen, [])
  assert.deepEqual(r.verdwenen, [])
})
