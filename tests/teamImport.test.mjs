// Tests voor src/services/teamImport.js (kaart thewally/ontwikkelstraat#36).
// Draaien met: node --test tests/teamImport.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  voorstelNaam, voorstelCategorie, ontbrekendeTeams, normaliseerNaam, uniekeTeams,
} from '../src/services/teamImport.js'

test('voorstelNaam: jeugd man en vrouw', () => {
  assert.equal(voorstelNaam("VVZ '49 O13-1", 'man'), 'JO13-1')
  assert.equal(voorstelNaam("VVZ '49 O13-1", 'vrouw'), 'MO13-1')
  assert.equal(voorstelNaam("VVZ '49 O8-1", 'man'), 'JO8-1')
  assert.equal(voorstelNaam("VVZ '49 O12-2", 'man'), 'JO12-2')
})

test('voorstelNaam: O23, senioren en veteranen', () => {
  assert.equal(voorstelNaam("VVZ '49 O23-1", 'man'), 'O23-1')
  assert.equal(voorstelNaam("VVZ '49 2", 'man'), 'VVZ 2')
  assert.equal(voorstelNaam("VVZ '49 3", 'man'), 'VVZ 3')
  assert.equal(voorstelNaam("VVZ '49 35+1", 'man'), '35+ 1')
  assert.equal(voorstelNaam("VVZ '49 45+1", 'man'), '45+ 1')
})

test('voorstelNaam: prefixvarianten, onbekend en leeg', () => {
  assert.equal(voorstelNaam("ST SO Soest/VVZ'49 O14-1", 'man'), 'JO14-1')
  assert.equal(voorstelNaam('VVZ ’49 O9-1', 'man'), 'JO9-1')
  assert.equal(voorstelNaam("VVZ '49 Zaal Mix", 'man'), 'Zaal Mix')
  assert.equal(voorstelNaam('', 'man'), '')
  assert.equal(voorstelNaam(undefined), '')
})

test('voorstelCategorie volgens leeftijd', () => {
  const t = (teamnaam, speeldag = 'Zaterdag', leeftijdscategorie = '') => ({ teamnaam, speeldag, leeftijdscategorie })
  assert.equal(voorstelCategorie(t("VVZ '49 O8-1")), 'Pupillen')
  assert.equal(voorstelCategorie(t("VVZ '49 O12-2")), 'Pupillen')
  assert.equal(voorstelCategorie(t("VVZ '49 O13-1")), 'Junioren')
  assert.equal(voorstelCategorie(t("VVZ '49 O19-2")), 'Junioren')
  assert.equal(voorstelCategorie(t("VVZ '49 O23-1")), 'Senioren')
  assert.equal(voorstelCategorie(t("VVZ '49 2")), 'Senioren')
  assert.equal(voorstelCategorie(t("VVZ '49 35+1")), 'Veteranen')
  assert.equal(voorstelCategorie(t("VVZ '49 45+1", 'Vrijdag')), 'Veteranen')
})

test('voorstelCategorie: zaal en onbekend krijgen geen categorie', () => {
  assert.equal(voorstelCategorie({ teamnaam: "VVZ '49 5", speeldag: 'Dinsdag' }), '')
  assert.equal(voorstelCategorie({ teamnaam: "VVZ '49 5", speeldag: '' }), '')
  assert.equal(voorstelCategorie({ teamnaam: "VVZ '49 Mix", speeldag: 'Zaterdag' }), '')
})

test('voorstelCategorie: terugval op leeftijdscategorie', () => {
  assert.equal(voorstelCategorie({ teamnaam: "VVZ '49 Mini", speeldag: 'Zaterdag', leeftijdscategorie: 'Onder 9' }), 'Pupillen')
  assert.equal(voorstelCategorie({ teamnaam: "VVZ '49 Vet", speeldag: 'Zondag', leeftijdscategorie: 'Senioren' }), 'Senioren')
})

test('normaliseerNaam negeert hoofdletters, spaties en streepjes', () => {
  assert.equal(normaliseerNaam('JO13-1'), normaliseerNaam('jo 13 1'))
  assert.equal(normaliseerNaam('35+ 1'), normaliseerNaam('35+1'))
})

const rij = (o) => ({ teamcode: 1, teamnaam: "VVZ '49 O13-1", geslacht: 'man', leeftijdscategorie: 'Onder 13', speeldag: 'Zaterdag', competitiesoort: 'regulier', ...o })

test('uniekeTeams: competitie en beker geven een team, speeldagen samengevoegd', () => {
  const u = uniekeTeams([rij({ speeldag: '' }), rij({ competitiesoort: 'beker', speeldag: 'Zaterdag' })])
  assert.equal(u.length, 1)
  assert.deepEqual(u[0].speeldagen, ['Zaterdag'])
})

test('ontbrekendeTeams: bestaand team wordt niet opnieuw voorgesteld', () => {
  const sl = [rij(), rij({ teamcode: 2, teamnaam: "VVZ '49 O12-2", leeftijdscategorie: 'Onder 12' })]
  const r = ontbrekendeTeams(sl, [{ name: 'jo13-1' }, { name: 'Selectie' }])
  assert.deepEqual(r.map(x => x.name), ['JO12-2'])
  assert.equal(r[0].category, 'Pupillen')
})

test('ontbrekendeTeams: beker- en competitierij geven een voorstel', () => {
  const sl = [rij(), rij({ competitiesoort: 'beker' }), rij({ competitiesoort: 'beker' })]
  assert.equal(ontbrekendeTeams(sl, []).length, 1)
})

test('ontbrekendeTeams: alles aanwezig of lege invoer geeft lege lijst', () => {
  assert.deepEqual(ontbrekendeTeams([rij()], [{ name: 'JO13-1' }]), [])
  assert.deepEqual(ontbrekendeTeams([], []), [])
  assert.deepEqual(ontbrekendeTeams(null, null), [])
})

test('ontbrekendeTeams: zaalteam zonder reguliere speeldag krijgt geen categorie', () => {
  const r = ontbrekendeTeams([rij({ teamcode: 9, teamnaam: "VVZ '49 7", speeldag: 'Dinsdag' })], [])
  assert.equal(r[0].name, 'VVZ 7')
  assert.equal(r[0].category, '')
})
