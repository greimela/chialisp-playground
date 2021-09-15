import * as clvm_tools from 'clvm_tools/browser';

export function initRunner() {
  clvm_tools.initialize();
}

export function run(source: string, args = ''): string {
  if (source.startsWith('(mod')) {
    const compiled = goAndReturn('run', source);
    if (compiled.startsWith('FAIL')) {
      return compiled;
    }

    return goAndReturn('brun', compiled, args);
  } else {
    if (args) {
      return goAndReturn('run', source, args);
    } else {
      return goAndReturn('run', source);
    }
  }
}

export const debounce = (fn: Function, ms = 300) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function (this: any, ...args: any[]) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), ms);
  };
};

export function goAndReturn(
  operation: 'run' | 'brun',
  sourceString: string,
  argumentString: string = '',
): string {
  let result = '';

  clvm_tools.setPrintFunction((...messages: any[]) => (result = messages.join(' ')));
  try {
    clvm_tools.go(operation, sourceString, argumentString);
  } catch (error) {
    return 'FAIL:' + (error as any).message;
  }

  return result;
}
