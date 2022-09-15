import {JsonLd, Rdf} from "./Vocabulary.js"

export function basic(username, password) {
    const credentials = [username, password].join(":")
    const encoded = btoa(credentials)

    return `Basic ${encoded}`
}

export function bearer(token) {
    return `Bearer ${token}`
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
