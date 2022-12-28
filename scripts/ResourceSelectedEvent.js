import {ResourceEvent} from "./ResourceEvent.js"

export class ResourceSelectedEvent extends ResourceEvent {
    static TYPE = "resourceSelected"

    constructor(resourceUri, init) {
        super(ResourceSelectedEvent.TYPE, resourceUri, init)
    }
}
