import HillChart from '../'

export default class MyHillChart {
  constructor(config) {
    this.onChange = config.onChange
    this.selected = null;
    this.total = 1;
    this.init()
  }
  setInitialValues(values) {
    values.map(item => this.addItem(item, true))
  }
  getItems(id) {
    return this.mychart ? this.mychart.getValue(id) : []
  }
  deleteItem(id) {
    if (this.mychart) this.mychart.deleteItem({ id })
  }
  enableStep(enabled){
    if (this.mychart) this.mychart.enableStep(enabled)
  }
  addItem(item, initialized) {
    if (this.mychart) {
      if (item) {
        this.mychart.addItem({
          id: item.id || this.total,
          color: item.color || 'green',
          desc: item.title || ('Untitled' + this.total),
          x: item.value || 0,
          percent: item.value || 0,
          initialized
        })
      } else {
        this.mychart.addItem({
          id: this.total,
          color: 'green',
          desc: ('Untitled' + this.total),
          x: 0,
          percent: 0
        })
      }
      this.total = this.total + 1
    }
  }
  disableChart(disable) {
    if (this.mychart) this.mychart.disableChart(disable)
  }
  enableGhost(visible) {
    if (this.mychart) this.mychart.enableGhost(visible)
  }
  init() {


    let container = document.getElementById('mycontainer')
    const config = {
      target: '#mycontainer',
      width: container.parentElement.clientWidth,
      onChange: (d) => {
        this.selected = d
        deleteButton.disabled = false
        if (this.onChange) this.onChange(d)
      }
    }

    this.mychart = new HillChart(config)

    window.addEventListener('resize', () => {
      this.mychart.resize(container.parentElement.clientWidth)
    })

    //----title Input-----
    let para = document.createElement("input");
    para.setAttribute('class', 'input-box')

    //----Read Only---
    let readOnly = document.createElement("input");
    readOnly.setAttribute("type", "checkbox");
    readOnly.addEventListener('change', (e) => {
      this.mychart.disableChart(e.target.checked)
    })
    let span = document.createElement("span");
    span.innerText = " Read Only  "

    //----Enable Ghost---
    let enableGhost = document.createElement("input");
    enableGhost.setAttribute("type", "checkbox");
    enableGhost.addEventListener('change', (e) => {
      this.mychart.enableGhost(e.target.checked)
    })
    let span2 = document.createElement("span");
    span2.innerText = " Enable Ghost  "

    //----Enable Step---
    let enableStep = document.createElement("input");
    enableStep.setAttribute("type", "checkbox");
    enableStep.addEventListener('change', (e) => {
      this.mychart.enableStep(e.target.checked)
    })
    let span3 = document.createElement("span");
    span3.innerText = " Enable Step  "

    //----Color Picker----
    let picker = document.createElement("input");
    picker.setAttribute('class', 'jscolor input-box')
    picker.value = '#00FF33'

    //-----Add Item------
    let addButton = document.createElement("button");
    addButton.setAttribute('class', 'add-button')
    addButton.innerText = "Add"

    addButton.addEventListener("click", () => {
      this.mychart.addItem({ id: this.total, color: '#' + picker.value, desc: para.value || ('Untitled' + this.total), x: 0, percent: 0 })
      this.total = this.total + 1
    });

    //-----Delete Item-----
    let deleteButton = document.createElement("button");
    deleteButton.setAttribute('class', 'add-button')
    deleteButton.innerText = "Delete"
    deleteButton.disabled = true

    deleteButton.addEventListener("click", () => {
      this.mychart.deleteItem(this.selected)
      deleteButton.disabled = true
      this.selected = null
    });


    let getButton = document.createElement("button");
    getButton.setAttribute('class', 'add-button')
    getButton.innerText = "Get"

    //---Status Table---
    getButton.addEventListener("click", () => {
      let items = this.mychart.getValue();
      let oldTable = document.getElementById('mytable')
      if (oldTable) {
        oldTable.remove()
      }
      let table = document.createElement('table')
      table.border = '1'
      table.id = 'mytable'
      table.setAttribute('class', 'items-table')
      items.map((item, index) => {
        let tr = document.createElement('tr')

        let td = document.createElement('td')
        td.innerText = item.id
        tr.appendChild(td)
        td = document.createElement('td')
        td.innerText = item.color
        td.style.color = item.color
        tr.appendChild(td)
        td = document.createElement('td')
        td.innerText = item.desc
        tr.appendChild(td)
        td = document.createElement('td')
        td.innerText = item.percent.toFixed(0) + '%'
        tr.appendChild(td)

        table.appendChild(tr)
      })
      container.appendChild(table)
    });


    container.appendChild(enableGhost)
    container.appendChild(span2)
    container.appendChild(para)
    container.appendChild(picker)
    container.appendChild(addButton)
    container.appendChild(deleteButton)
    container.appendChild(getButton)
    container.appendChild(readOnly)
    container.appendChild(span)
    container.appendChild(enableStep)
    container.appendChild(span3)

  }
}

let chart = new MyHillChart({
  onChange: (value) => {
    console.log(value.id, value.desc, value.percent.toFixed(0) + '%')
  }
})
let values = [
  { color: 'rgb(87,159,208)', title: 'Future-applying edits', value: 20 },
  { color: 'rgb(83,152,93)', title: 'Permas per occurance', value: 50 },
  { color: 'rgb(238,156,72)', title: 'Global recuring events', value: 70 },
  { color: 'rgb(49,96,187)', title: 'Streamlined event-adding', value: 100 },
]
chart.setInitialValues(values)
// chart.disableChart(true)
// chart.getItems(id) : id can be nullable
// chart.addItem({id:xx, color: xxx, title: xxx})
// chart.deleteItem(id)