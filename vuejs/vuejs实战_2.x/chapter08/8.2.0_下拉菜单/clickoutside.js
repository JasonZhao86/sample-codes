Vue.directive("clickoutside", {
    bind: function (el, binding, vnode) {
        function documentHandler(e) {
            if (el.contains(e.target)) {
                return false
            }

            if (binding.expression) {
                // 如果自定义指令clickoutside的值是一个表达式，则bindding.value()就代表该表达式，即handleClose(e)
                binding.value(e)
            }
        }
        /*
            vue2.0中不能再用this.xxx的形式在上下文中声明一个变量，所以用了el.vueClickOutside引用了docurnentHandler，
            这样做的目的就是可以在unbind钩子里移除对document的click事件监听。如果不移除，当组件或元素销毁时，它仍然存在于内存中。
         */
        el.__vueClickOutside__ = documentHandler
        document.addEventListener('click', documentHandler)
    },
    unbind: function (el, binding) {
        document.removeEventListener('click', el.__vueClickOutside__)
        delete el.__vueClickOutside__
    }
})