# Vev Events

Addon to dispatch `Vev Events`.

This addon will make events created by elements available as actions:

```js
enum Events {
  NEXT = "NEXT",
  PREV = "PREV",
}

registerVevComponent(Slideshow, {
  name: "Slideshow",
  events: [
    {
      name: Events.NEXT,
      description: "Next",
    },
    {
      name: Events.PREV,
      description: "Prev",
    },
  ],
});
```