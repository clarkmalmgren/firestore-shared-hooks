# firestore-shared-hooks

Provides a simple mechanism for getting access to firestore collections and documents
while allowing for shared data across multiple hooks. This is achived by utilizing a
pathed singleton pattern to ensure that all hooks that use the same path use the same
underlying data, updates, and connection.

## Installation

```sh
yarn add firestore-shared-hooks
```

## Usage

First, you need to declare your service and pathed singleton lookup.
```ts
import { SharedDocumentListenerService } from 'firestore-shared-hooks'

class DroidService extends SharedDocumentListenerService<Droid> {

  private static singletons: { [id: string]: DroidService } = {}

  static for(id: string): DroidService {
    if (!(id in this.singletons)) {
      this.singletons[id] = new DroidService(id)
    }
    return this.singletons[id]
  }

  private constructor(readonly id: string) {
    // This is the resolved path to the document in firestore
    super(`droids/${id}`)
  }
}
```

Next, you create your own hook through composition using the shared service
```ts
import { useSharedHook } from 'firestore-shared-hooks'

export function useDroid(id: string): Droid | undefined {
  return useSharedHook(
    DroidService.for(id), // find the service from the pathed singletons
    (data) => data,       // optionally transform the data
    [ id ]                // list of dependencies that might change input state
  )
}
```

## License

[MIT](LICENSE)
