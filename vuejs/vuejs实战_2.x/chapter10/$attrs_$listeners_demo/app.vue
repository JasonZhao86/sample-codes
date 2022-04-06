<!--
    * @FileDescription：A组件
-->

<template>
  <div id="app">
    <child1
        p-child1="child1"
        p-child2="child2"
        v-on:test1="onTest1"
        v-on:test2="onTest2">   <!--此处监听了两个自定义事件，可以在B或者C组件中直接触发-->
    </child1>
  </div>
</template>

<script>
    import Child1 from './components/Child1.vue';

    export default {
      data () {
        return {};
      },
      components: {
          Child1
      },
      methods: {
        onTest1 () {
          console.log('test1 running...');
        },
        onTest2 () {
          console.log('test2 running');
        }
      }
    };
</script>
