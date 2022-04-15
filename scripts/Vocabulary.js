export const HttpHeader = {
    Accept: "Accept",
    ContentType: "Content-Type",
    WwwAuthenticate: "WWW-authenticate",
    Authorization: "Authorization",
    Link: "Link",
    Slug: "Slug"
}

export const HttpMethod = {
    Get: "GET",
    Post: "POST",
    Head: "HEAD",
    Patch: "PATCH",
    Put: "PUT",
    Delete: "DELETE"
}

export const Hydra = {
    Next: "http://www.w3.org/ns/hydra/core#next",
    Previous: "http://www.w3.org/ns/hydra/core#previous"
}

export const JsonLd = {
    Graph: "@graph",
    Id: "@id",
    Type: "@type",
    Value: "@value"
}

export const Ldp = {
    NS: "http://www.w3.org/ns/ldp#",
    Contains: "http://www.w3.org/ns/ldp#contains",
    NonRdfSource: "http://www.w3.org/ns/ldp#NonRDFSource",
    RdfSource: "http://www.w3.org/ns/ldp#RDFSource",
    BasicContainer: "http://www.w3.org/ns/ldp#BasicContainer"
}

export const Mime = {
    Form: "application/x-www-form-urlencoded",
    Json: "application/json",
    JsonLd: "application/ld+json",
    SparqlUpdate: "application/sparql-update",
    Turtle: "text/turtle",
    Trig: "application/trig",
    Text: "text/plain",
    OctetStream: "application/octet-stream",
    Pdf: "application/pdf",
    Svg: "image/svg+xml",
    Html: "text/html"
}

export const Oidc = {
    Discovery: ".well-known/openid-configuration",
    Code: "code",
    AuthorizationCode: "authorization_code",
    IdToken: "http://openid.net/specs/openid-connect-core-1_0.html#IDToken",
    Scope: "openid"
}

export const Rdf = {
    NS: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    Type: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
    BlankNodePrefix: "_"
}

export const Solid = {
    WebIdScope: "webid",
    OidcIssuer: "http://www.w3.org/ns/solid/terms#oidcIssuer",
    AclLinkHeaderParser: /[^<]+(?=>; rel="acl")/,
}

export const Uma = {
    Discovery: "/.well-known/uma2-configuration",
    TicketParser: /as_uri="([^"]+)", ticket="([^"]+)"/,
    TicketGrant: "urn:ietf:params:oauth:grant-type:uma-ticket"
}

export const Pim = {
    Storage: "http://www.w3.org/ns/pim/space#storage"
}
