function isValueNumber(value) {
    return (/(^-?[0-9]+\.{1}\d+$)|(^-?[1-9][0-9]*$)|(^-?0{1}$)/).test(value + '')
}

Vue.component('input-number', {
    template: "<div class='input-number'>" +
                    "<input type='text' :value='currentValue' @change='chandleChange' />" +
                    "<button @click='handleDown' :disabled='currentValue <= min'>-</button>" +
                    "<button @click='handleUp' :disabled='currentValue >= max'>+</button>" +
              "</div>",
    props: {
        max: {
            type: Number,
            default: Infinity
        },
        min: {
            type: Number,
            default: -Infinity
        },
        value: {
            type: Number,
            default: 0
        }
    },
    data: function () {
        /*
        // 或者在data选项返回初始数据之前就进行过滤
        let val = this.value
        if (val > this.max) val = this.max
        if (val < this.min) val = this.min

        return {
            currentValue: val
        }
        */

        return {
            currentValue: this.value
        }
    },
    watch: {
        // watch监听的数据的回调函数有2个参数可用，第一个是新的值，第二个是旧的值
        currentValue: function (val) {
            // 触发父组件的v-model改变其绑定的value
            this.$emit('input', val)
            // 触发父组件的自定义事件on-change，此次示例中父组件没有定义on-change事件
            this.$emit('on-change', val)
        },
        value: function (val) {
            this.updateValue(val)
        }
    },
    methods: {
        updateValue: function (val) {
            if (val > this.max) this.currentValue = this.max
            if (val < this.min) this.currentValue = this.min
            this.currentValue = val
        },
        handleDown: function () {
            if (this.currentValue <= this.min) return
            this.currentValue--
        },
        handleUp: function () {
            if (this.currentValue >= this.max) return
            this.currentValue++
        },
        chandleChange: function (e) {
            let val = e.target.value.trim()
            let max = this.max
            let min = this.min

            if (isValueNumber(val)) {
                val = Number(val)
                this.currentValue = val

                if (val > max) {
                    this.currentValue = max
                } else if (val < min) {
                    this.currentValue = min
                }
            } else {
                e.target.value = this.currentValue
            }
        }
    },
    /* 本来不定义该钩子也是可以的，但是需要校验数字的范围，而默认组件初始化的时候父组件v-model绑定的value直接传给了子组件
       input标签的value属性，并没有经过数字范围的校验，也就有可能产生bug，因此第一次初始化时，也需要对value进行了过滤，
       调用updateValue
    */
    mounted: function () {
        let _this = this
        _this.updateValue(_this.value)
    }
})