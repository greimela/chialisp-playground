<template>
  <Header></Header>
  <div class="container-xl pt-4">
    <div class="row">
      <div class="col-lg-9 col-md-12">
        <Editor :value="sourceCode" @update:value="debouncedRunSource"></Editor>
      </div>
      <div class="col-lg-3 col-md-12 pt-lg-0 pt-4">
        ARGUMENTS
        <br />
        <input type="text" v-model="args" @keyup="() => debouncedRunSource()" />
        <br />
        <br />
        RESULT
        <div :class="{'text-danger': hasError}">{{ result }}</div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import {debounce} from 'lodash';
import Header from './components/Header.vue';
import Editor from './components/Editor.vue';
import {run, initRunner} from './runner';

initRunner();

const sourceCode = `\
(mod (password new_puzhash amount)
  (defconstant CREATE_COIN 51)

  (if (= (sha256 password) (q . 0x9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08))
    (list (list CREATE_COIN new_puzhash amount))
    (x)
  )
)`;
const args = '(test new_puzhash 10)';
const result = '';
const hasError = false;

export default defineComponent({
  components: {
    Header,
    Editor,
  },
  data() {
    return {sourceCode, args, result, hasError};
  },
  mounted() {
    this.debouncedRunSource(this.sourceCode);
  },
  methods: {
    debouncedRunSource: debounce(function (this: any, source: string) {
      this.sourceCode = source || this.sourceCode;
      this.result = run(this.sourceCode, this.args);
      this.hasError = this.result.startsWith('FAIL');
    }, 300),
  },
});
</script>