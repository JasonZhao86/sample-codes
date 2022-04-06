var app = new Vue({
    el: "#app",
    data: {
        list: [
            {
                id: 1 ,
                name: 'iPhone 7',
                price: 6188 ,
                count: 1
            },
            {
                id: 2 ,
                name: 'iPad Pro',
                price: 5888,
                count: 1
            },
            {
                id: 3 ,
                name: 'MacBook Pro',
                price: 21488,
                count: 1
            }
        ]
    },
    computed: {
        totalPrice: function () {
            let totalPrice = 0
            for (let item of this.list) {
                totalPrice += item.price * item.count
            }
            return totalPrice.toString().replace(/\B(?=(\d{3})+$)/g, ',')
        }
    },
    methods: {
        handleAdd: function (index) {
            this.list[index].count++
        },
        handleReduce: function (index) {
            if (this.list[index].count === 1) return
            this.list[index].count--
        },
        handleRemove: function (index) {
            this.list.splice(index, 1)
        }
    }
})
