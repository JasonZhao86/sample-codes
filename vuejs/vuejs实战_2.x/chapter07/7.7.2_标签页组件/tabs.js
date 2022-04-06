Vue.component("tabs", {
    template: "" +
        "<div class='tabs'>" +
            "<div class='tabs-bar'>" +
                "<div " +
                    ":class='tabCls(item)' " +
                    "v-for='(item, index) in navList' " +
                    "@click='handleChange(index)'>" +
                    "{{ item.label }}" +
                "</div>" +
            "</div>" +
            "<div class='tabs-content'>" +
                "<slot></slot>" +
            "</div>" +
        "</div>",
    props: {
        value: [String, Number]
    },
    data: function () {
        return {
            currentValue: this.value,
            navList: []
        }
    },
    methods: {
        tabCls: function (item) {
            return [
                'tabs-tab',
                {
                    // 给当前选中的tab加一个class
                    'tabs-tab-active': item.name === this.currentValue
                }
            ]
        },
        getTabs: function () {
            // 通过遍历子组件，得到所有的pane组件
            return this.$children.filter(function (item) {
                return item.$options.name === 'pane'
            })
        },
        updateNav: function () {
            // 清空，避免前一个pane组件渲染后的navList的干扰
            this.navList = []
            // 设置对this的引用，在function回调里，this指向的并不是Vue实例
            let _this = this
            this.getTabs().forEach(function (pane, index) {
                _this.navList.push({
                    label: pane.label,
                    name: pane.name || index
                })

                // 如果没有给pane设置name，默认设置它的索引
                if (!pane.name) pane.name = index
                // 设置当前选中的tab的索引
                if (index === 0) {
                    if (!_this.currentValue) {
                        _this.currentValue = pane.name || index
                    }
                }

            })
            this.updateStatus()
        },
        updateStatus: function () {
            let tabs = this.getTabs()
            let _this = this
            // 显示当前选中的tab对应的pane组件，隐藏没有选中的
            tabs.forEach(function (tab) {
                return tab.show = _this.currentValue === tab.name
            })
        },
        handleChange: function (index) {
            var nav = this.navList[index]
            var name = nav.name
            // 改变当前选中的tab，并触发下面的watch
            this.currentValue = name
            this.$emit('input', name)
            this.$emit('on-click', name)
        }
    },
    watch: {
        value: function (val) {
            this.currentValue = val
        },
        currentValue: function () {
            // 在当前选中的tab发生变化时，更新pane的显示状态
            this.updateStatus()
        }
    }
})
