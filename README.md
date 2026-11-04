# Solid Explorer

A browser for Solid pods: https://langsamu.github.io/solid-explorer/

## Old service worker

Earlier versions of Solid Explorer registered a service worker (`worker.js`) to authenticate requests. Solid Explorer no longer uses it, but browsers that ran an earlier version may still have it registered, and it can interfere with requests.

If Solid Explorer fails to load resources, unregister the old service worker manually: open the browser's developer tools, go to Application → Service workers, and click Unregister next to `worker.js`. Then reload the page.

TODO: Remove this section after May 2027.
