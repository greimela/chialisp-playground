import type {LanguageId} from './register';
import type {ScopeName, TextMateGrammar, ScopeNameInfo} from './providers';

// Recall we are using MonacoWebpackPlugin. According to the
// monaco-editor-webpack-plugin docs, we must use:
//
// import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
//
// instead of
//
// import * as monaco from 'monaco-editor';
//
// because we are shipping only a subset of the languages.
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import {createOnigScanner, createOnigString, loadWASM} from 'vscode-oniguruma';
import {SimpleLanguageInfoProvider} from './providers';
import {registerLanguages} from './register';
import {rehydrateRegexps} from './configuration';
import VsCodeDarkTheme from './vs-dark-plus-theme';

interface DemoScopeNameInfo extends ScopeNameInfo {
  path: string;
}

main('chialisp');

async function main(language: LanguageId) {
  // In this demo, the following values are hardcoded to support Python using
  // the VS Code Dark+ theme. Currently, end users are responsible for
  // extracting the data from the relevant VS Code extensions themselves to
  // leverage other TextMate grammars or themes. Scripts may be provided to
  // facilitate this in the future.
  //
  // Note that adding a new TextMate grammar entails the following:
  // - adding an entry in the languages array
  // - adding an entry in the grammars map
  // - making the TextMate file available in the grammars/ folder
  // - making the monaco.languages.LanguageConfiguration available in the
  //   configurations/ folder.
  //
  // You likely also want to add an entry in getSampleCodeForLanguage() and
  // change the call to main() above to pass your LanguageId.
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

  const data: ArrayBuffer | Response = await loadVSCodeOnigurumWASM();
  loadWASM(data);
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

  const value = getSampleCodeForLanguage(language);
  const id = 'container';
  const element = document.getElementById(id);
  if (element == null) {
    throw Error(`could not find element #${id}`);
  }

  monaco.editor.create(element, {
    value,
    language,
    theme: 'vs-dark',
    minimap: {
      enabled: true,
    },
  });
  provider.injectCSS();
}

// Taken from https://github.com/microsoft/vscode/blob/829230a5a83768a3494ebbc61144e7cde9105c73/src/vs/workbench/services/textMate/browser/textMateService.ts#L33-L40
async function loadVSCodeOnigurumWASM(): Promise<Response | ArrayBuffer> {
  const response = await fetch('/node_modules/vscode-oniguruma/release/onig.wasm');
  const contentType = response.headers.get('content-type');
  if (contentType === 'application/wasm') {
    return response;
  }

  // Using the response directly only works if the server sets the MIME type 'application/wasm'.
  // Otherwise, a TypeError is thrown when using the streaming compiler.
  // We therefore use the non-streaming compiler :(.
  return await response.arrayBuffer();
}

function getSampleCodeForLanguage(language: LanguageId): string {
  if (language === 'chialisp') {
    return `\
(mod (
       POOL_PUZZLE_HASH
       P2_SINGLETON_PUZZLE_HASH
       OWNER_PUBKEY
       POOL_REWARD_PREFIX
       WAITINGROOM_PUZHASH
       Truths
       p1
       pool_reward_height
     )


  ; POOL_PUZZLE_HASH is commitment to the pool's puzzle hash
  ; P2_SINGLETON_PUZZLE_HASH is the puzzle hash for your pay to singleton puzzle
  ; OWNER_PUBKEY is the farmer pubkey which authorises a travel
  ; POOL_REWARD_PREFIX is network-specific data (mainnet vs testnet) that helps determine if a coin is a pool reward
  ; WAITINGROOM_PUZHASH is the puzzle_hash you'll go to when you iniate the leaving process

  ; Absorbing money if pool_reward_height is an atom
  ; Escaping if pool_reward_height is ()

  ; p1 is pool_reward_amount if absorbing money
  ; p1 is key_value_list if escaping

  ; pool_reward_amount is the value of the coin reward - this is passed in so that this puzzle will still work after halvenings
  ; pool_reward_height is the block height that the reward was generated at. This is used to calculate the coin ID.
  ; key_value_list is signed extra data that the wallet may want to publicly announce for syncing purposes

  (include condition_codes.clib)
  (include singleton_truths.clib)

  ; takes a lisp tree and returns the hash of it
  (defun sha256tree (TREE)
      (if (l TREE)
          (sha256 2 (sha256tree (f TREE)) (sha256tree (r TREE)))
          (sha256 1 TREE)
      )
  )

  (defun-inline calculate_pool_reward (pool_reward_height P2_SINGLETON_PUZZLE_HASH POOL_REWARD_PREFIX pool_reward_amount)
    (sha256 (logior POOL_REWARD_PREFIX (logand (- (lsh (q . 1) (q . 128)) (q . 1)) pool_reward_height)) P2_SINGLETON_PUZZLE_HASH pool_reward_amount)
  )

  (defun absorb_pool_reward (POOL_PUZZLE_HASH my_inner_puzzle_hash my_amount pool_reward_amount pool_reward_id)
    (list
        (list CREATE_COIN my_inner_puzzle_hash my_amount)
        (list CREATE_COIN POOL_PUZZLE_HASH pool_reward_amount)
        (list CREATE_PUZZLE_ANNOUNCEMENT pool_reward_id)
        (list ASSERT_COIN_ANNOUNCEMENT (sha256 pool_reward_id '$'))
    )
  )

  (defun-inline travel_to_waitingroom (OWNER_PUBKEY WAITINGROOM_PUZHASH my_amount extra_data)
    (list (list AGG_SIG_ME OWNER_PUBKEY (sha256tree extra_data))
          (list CREATE_COIN WAITINGROOM_PUZHASH my_amount)
    )
  )

  ; main

  (if pool_reward_height
    (absorb_pool_reward POOL_PUZZLE_HASH
                        (my_inner_puzzle_hash_truth Truths)
                        (my_amount_truth Truths)
                        p1
                        (calculate_pool_reward pool_reward_height P2_SINGLETON_PUZZLE_HASH POOL_REWARD_PREFIX p1)
    )
    (travel_to_waitingroom OWNER_PUBKEY WAITINGROOM_PUZHASH (my_amount_truth Truths) p1)
  )
)`;
  }

  throw Error(`unsupported language: ${language}`);
}
