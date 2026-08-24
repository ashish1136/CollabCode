// Proxy mock for monaco-editor imported by y-monaco
// Relies on @monaco-editor/react which injects window.monaco dynamically.

function createProxy(className) {
  return new Proxy(class {}, {
    construct(target, args) {
      if (window.monaco && window.monaco[className]) {
        return new window.monaco[className](...args);
      }
      return {};
    },
    get(target, prop) {
      if (window.monaco && window.monaco[className]) {
        return window.monaco[className][prop];
      }
    }
  });
}

export const Range = createProxy('Range');
export const Selection = createProxy('Selection');
export const SelectionDirection = { LTR: 0, RTL: 1 };
