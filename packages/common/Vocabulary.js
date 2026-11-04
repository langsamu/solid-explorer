export const Hydra = {
    Next: "http://www.w3.org/ns/hydra/core#next",
    Previous: "http://www.w3.org/ns/hydra/core#previous"
}

export const HttpHeader = {
    Accept: "Accept",
    ContentType: "Content-Type",
    Link: "Link",
    Location: "Location",
    Slug: "Slug",
}

export const HttpMethod = {
    Delete: "DELETE",
    Get: "GET",
    Head: "HEAD",
    Patch: "PATCH",
    Post: "POST",
    Put: "PUT",
}

export const JsonLd = {
    Graph: "@graph",
    Id: "@id",
    Type: "@type",
    Value: "@value"
}

export const Ldp = {
    NS: "http://www.w3.org/ns/ldp#",
    BasicContainer: "http://www.w3.org/ns/ldp#BasicContainer",
    Contains: "http://www.w3.org/ns/ldp#contains",
    NonRdfSource: "http://www.w3.org/ns/ldp#NonRDFSource",
    RdfSource: "http://www.w3.org/ns/ldp#RDFSource",
}

export const Mime = {
    Bmp: "image/bmp",
    Form: "application/x-www-form-urlencoded",
    Ico: "image/vnd.microsoft.icon",
    Gif: "image/gif",
    Html: "text/html",
    Jpeg: "image/jpeg",
    Json: "application/json",
    JsonLd: "application/ld+json",
    Ntriples: "application/n-triples",
    OctetStream: "application/octet-stream",
    Png: "image/png",
    Pdf: "application/pdf",
    RdfXml: "application/rdf+xml",
    SparqlUpdate: "application/sparql-update",
    Svg: "image/svg+xml",
    Text: "text/plain",
    Trig: "application/trig",
    Turtle: "text/turtle",
    Webp: "image/webp",
    Xml: "text/xml",
}

export const Pim = {
    Storage: "http://www.w3.org/ns/pim/space#storage"
}

export const Rdf = {
    NS: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    Type: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
    BlankNodePrefix: "_"
}

export const Solid = {
    AclLinkHeaderParser: /[^<]+(?=>; rel="acl")/,
}
