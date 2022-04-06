<template>
    <div>
        <h1>首页</h1>
        {{ count }}
        <button @click="handleIncrement">+1</button>
        <button @click="handleDecrease">-1</button>
        <button @click="handleIncrementMore">+5</button>
        <div>{{ list }}</div>
        <div>{{ listCount }}</div>
        <button @click="handleActionIncrement">action +1</button>
        <button @click="handleAsyncIncrement">async +1</button>
        随机增加：
        <Counter :number="number"></Counter>
    </div>
</template>
<script>
    // 除了插件导入不需要添加.vue后缀之外，其他的所有自定义组件导入都需要加.vue后缀，否则编译不通过，提示找不到module
    import Counter from './counter.vue';

    export default {
        components: {
            Counter
        },
        computed: {
            count () {
                return this.$store.state.count;
            },
            list () {
                return this.$store.getters.filteredList;
            },
            listCount () {
                return this.$store.getters.listCount;
            }
        },
        methods: {
            handleIncrement () {
                this.$store.commit('increment');
            },
            handleDecrease () {
                this.$store.commit('decrease');
            },
            handleIncrementMore () {
                this.$store.commit('increment', 5);
            },
            handleActionIncrement () {
                this.$store.dispatch('increment')
            },
            handleAsyncIncrement () {
                this.$store.dispatch('asyncIncrement').then(() => {
                    console.log(this.$store.state.count);
                });
            },
            handleAddRandom (num) {
                this.number += num;
            }
        },
        data () {
            return {
                number: 0
            }
        },
        /*
            使用vue-bus自定义插件有两点需要注意，第一是$bus.on应该在created钩子内使用，如果在mounted使用，它可能接收不到其他组件来
            自created钩子内发出的事件：第二点是使用了$bus.on，在beforeDestroy钩子里应该再使用$bus.off解除，因为组件销毁后，就没必
            要把监听的句柄储存在vue-bus里了
         */
        created () {
            this.$bus.on('add', this.handleAddRandom);
        },
        beforeDestroy () {
            this.$bus.off('add', this.handleAddRandom);
        }
    }
</script>