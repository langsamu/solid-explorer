import {JsonLd, Rdf} from "./Vocabulary.js"

export async function fetchJson(input, init) {
    const response = await fetch(input, init)
    return await response.json()
}

export function basic(username, password) {
    const credentials = [username, password].join(":")
    const encoded = btoa(credentials)

    return `Basic ${encoded}`
}

export function bearer(token) {
    return `Bearer ${token}`
}

/**
 * @param {Array.<{"@id": string} & {"@graph": Array.<{"@id": string} & Record<string, Array.<string | {"@id": string} | {"@value": string}>>>}>} expandedJsonLd
 * @returns {Array.<{graph: string, subject: string, predicate: string, object: string}>}
 */
export function toQuads(expandedJsonLd) {
    return expandedJsonLd.flatMap(({[JsonLd.Id]: graph, [JsonLd.Graph]: subjects}) =>
        subjects.flatMap(({[JsonLd.Id]: subject, ...predicates}) =>
            Object.entries(predicates).flatMap(([predicate, objects]) =>
                objects.map(object => ({
                    graph,
                    subject,
                    predicate: predicate === JsonLd.Type ? Rdf.Type : predicate,
                    object: object.hasOwnProperty(JsonLd.Id) ? object[JsonLd.Id] : predicate === JsonLd.Type ? object : `"${object[JsonLd.Value]}"`
                })))))
}

export function toTriples(expandedJsonLd) {
    return expandedJsonLd.flatMap(({[JsonLd.Id]: subject, ...predicates}) =>
            Object.entries(predicates).flatMap(([predicate, objects]) =>
                objects.map(object => ({
                    subject,
                    predicate: predicate === JsonLd.Type ? Rdf.Type : predicate,
                    object: object.hasOwnProperty(JsonLd.Id) ? object[JsonLd.Id] : predicate === JsonLd.Type ? object : `"${object[JsonLd.Value]}"`
                }))))
}

export async function modal(dialog) {
    return await new Promise(resolve => {
        dialog.addEventListener("close", e => resolve(e.target.returnValue), {once: true})
        dialog.showModal()
    })
}
