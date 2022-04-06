<template>
    <!--
        运行网页时，＜router-view＞会根据当前路由动态渲染不同的页面组件。网页中一些公共部分，比如顶部的导航栏、侧边导航栏、底部的版权信息，
        这些也可以直接写在app.vue里，与＜router-view>同级。路由切换时，切换的是＜router-view＞挂载的组件，其他的内容井不会变化。
    -->
    <div>
        <router-view></router-view>
    </div>
</template>
<script>
    export default {
        
    }
</script>