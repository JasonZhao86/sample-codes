<template>
    <div>
        <h1>首页</h1>
        <!-- 使用＜ router-link＞，在HTML5的History模式下会拦截点击，避免浏览器重新加载页面。 -->
        <router-link to="/about">跳转到 about</router-link>
    </div>
</template>
<script>
    export default {

    }
</script>