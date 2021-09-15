<template>
  <div id="container">
    <div id="editor-section"></div>
  </div>
</template>

<script lang="ts">
import type {LanguageId} from '../register';
import type {ScopeName, TextMateGrammar, ScopeNameInfo} from '../providers';

import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import {createOnigScanner, createOnigString, loadWASM} from 'vscode-oniguruma';
import {SimpleLanguageInfoProvider} from '../providers';
import {registerLanguages} from '../register';
import {rehydrateRegexps} from '../configuration';
import VsCodeDarkTheme from '../vs-dark-plus-theme';
import {onMounted} from 'vue';

interface DemoScopeNameInfo extends ScopeNameInfo {
  path: string;
}

export default {
  name: 'Editor',
  props: ['value'],
  emits: ['update:value'],
  setup(props: any, {emit}: any) {
    let codeEditor: any = null;

    async function initEditor() {
      const languages: monaco.languages.ILanguageExtensionPoint[] = [
        {
          id: 'chialisp',
          extensions: ['.lisp', '.lsp', '.cl'],
          aliases: ['Chialisp', 'cl'],
        },
      ];
      const grammars: {[scopeName: string]: DemoScopeNameInfo} = {
        'source.chialisp': {
          language: 'chialisp',
          path: 'chialisp.tmLanguage.json',
        },
      };

      const fetchGrammar = async (scopeName: ScopeName): Promise<TextMateGrammar> => {
        const {path} = grammars[scopeName];
        const uri = `/grammars/${path}`;
        const response = await fetch(uri);
        const grammar = await response.text();
        const type = path.endsWith('.json') ? 'json' : 'plist';
        return {type, grammar};
      };

      const fetchConfiguration = async (
        language: LanguageId,
      ): Promise<monaco.languages.LanguageConfiguration> => {
        const uri = `/configurations/${language}.json`;
        const response = await fetch(uri);
        const rawConfiguration = await response.text();
        return rehydrateRegexps(rawConfiguration);
      };

      const onigLib = Promise.resolve({
        createOnigScanner,
        createOnigString,
      });

      const provider = new SimpleLanguageInfoProvider({
        grammars,
        fetchGrammar,
        configurations: languages.map((language) => language.id),
        fetchConfiguration,
        theme: VsCodeDarkTheme,
        onigLib,
        monaco,
      });
      registerLanguages(
        languages,
        (language: LanguageId) => provider.fetchLanguageInfo(language),
        monaco,
      );

      const id = 'container';
      const element = document.getElementById(id);
      if (element == null) {
        throw Error(`could not find element #${id}`);
      }

      codeEditor = monaco.editor.create(element, {
        value: props.value,
        language: 'chialisp',
        theme: 'vs-dark',
        minimap: {
          enabled: false,
        },
        automaticLayout: true,
      });
      codeEditor.onKeyUp(() => {
        emit('update:value', codeEditor.getValue());
      });
      provider.injectCSS();
    }

    onMounted(() => {
      initEditor();
    });

    return {codeEditor};
  },
};
</script>