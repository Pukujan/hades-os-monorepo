export function registerModuleEvents(context) {
  // context.eventBus.on("some:event", handler);
  context.eventBus.emit("module:registered", { module: "_reference" });
}
