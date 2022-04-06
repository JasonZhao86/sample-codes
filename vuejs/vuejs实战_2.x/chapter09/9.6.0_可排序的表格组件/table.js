Vue.component('v-table', {
    props: {
        columns: {
            type: Array,
            default: function () {
                return []
            }
        },
        data: {
            type: Array,
            default: function () {
                return []
            }
        }
    },
    data: function () {
        return {
            currentColumns: [],
            currentData: []
        }
    },
    methods: {
        makeColumns: function () {
            this.currentColumns = this.columns.map(function (col, index) {
                // 添加一个字段标识当前列排序的状态，normal表示默认排序〈也就是不排序〉
                col._sortType = 'normal'
                // 添加一个字段标识当前列在数组中的索引
                col._index = index
                return col
            })
        },
        makeData: function () {
            this.currentData = this.data.map(function (row, index) {
                // 排序后currentData每项的顺序可能都会发生变化，添加一个字段标识当前行在原始数组中的索引
                row._index = index
                return row
            })
        },
        handleSortByAsc: function (index) {
            let key = this.currentColumns[index].key
            this.currentColumns.forEach(function (col) {
                col._sortType = 'normal'
            })
            this.currentColumns[index]._sortType = 'asc'
            this.currentData.sort(function (a, b) {
                return a[key] > b[key] ? 1 : -1
            })
        },
        handleSortByDesc: function (index) {
            let key = this.currentColumns[index].key
            this.currentColumns.forEach(function (col) {
                col._sortType = 'normal'
            })
            this.currentColumns[index]._sortType = 'desc'
            this.currentData.sort(function (a, b) {
                return a[key] < b[key] ? 1 : -1
            })
        }
    },
    mounted: function () {
        // v-table初始化时调用
        this.makeColumns()
        this.makeData()
    },
    // 此处的h就是createElement的简写
    render: function (h) {
        let _this = this
        let ths = []
        this.currentColumns.forEach(function (col, index) {
            if (col.sortable) {
                ths.push(h('th', [
                    h('span', col.title),
                    h('a', {
                        class: {
                            on: col._sortType === 'asc'
                        },
                        on: {
                            click: function () {
                                _this.handleSortByAsc(index)
                            }
                        }
                    }, '↑'),
                    h('a', {
                        class: {
                            on: col._sortType === 'desc'
                        },
                        on: {
                            click: function () {
                                _this.handleSortByDesc(index)
                            }
                        }
                    }, '↓')
                ]))
            } else {
                ths.push(h('th', col.title))
            }
        })
        let trs = []
        this.currentData.forEach(function (row) {
            let tds = []
            _this.currentColumns.forEach(function (cell) {
                tds.push(h('td', row[cell.key]))
            })
            trs.push(h('tr', tds))
        })
        // thead是一行多列（一个<tr>、多个<th>)，tbody是多行多列（多个<tr>、多个<td>）
        return h('table', [
            h('thead', [
                h('tr', ths)
            ]),
            h('tbody', trs)
        ])
    },
    watch: {
        data: function () {
            this.makeData()
            // 遍历currentColumns找出表格数据是否已经按某一列进行过了排序
            let sortedColumn = this.currentColumns.filter(function (col) {
                return col._sortType !== 'normal'
            })
            // 只有排过序的表格，在增删数据之后才需要被重新排序。
            if (sortedColumn.length > 0) {
                if (sortedColumn[0]._sortType === 'asc') {
                    this.handleSortByAsc(sortedColumn[0]._index)
                } else {
                    this.handleSortByDesc(sortedColumn[0]._index)
                }
            }
        }
    },
    mounted: function () {
        this.makeColumns()
        this.makeData()
    }
})
