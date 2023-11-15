import { select, event } from 'd3-selection'
import { scaleLinear } from 'd3-scale'
import { axisBottom } from 'd3-axis'
import { line } from 'd3-shape'
import { drag } from 'd3-drag'
import { range } from 'd3-array'
import { transition } from 'd3-transition'

const defaults = {
  width: 1000,
  height: 300,
  margin: {
    top: 50,
    right: 10,
    bottom: 35,
    left: 10
  },
  data: [],
  ghost: [],
  selected: 0,
  notInitialized: 0,
  disabled: false,
  showGhost: false,
  stepEnabled: false,
}

const CONNECTOR_LENGHT = 18
const ITEM_LINE_HEIGHT = 16
const CIRCLE_TEXT_DISTANCE = 22
const GHOST_OPACITY = 0.5
const POINT_CHANGE_DIRECTION = 75
const APPEAR_GHOST_DISTANCE = 20

function getTextWidth(text, fontSize = 13, fontFace = 'sans-serif') {
  var canvas = document.createElement('canvas');
  var context = canvas.getContext('2d');
  context.font = fontSize + 'px ' + fontFace;
  return context.measureText(text).width;
}

export default class HillChart {
  constructor(config) {
    Object.assign(this, defaults, config)
    this.init()
  }

  addItem(item) {
    if (this.disabled) return;
    let { data, ghost } = this
    this.notInitialized = 0
    data.map(o=>{
      if (o.x<0.1) this.notInitialized = this.notInitialized + 1
    })

    const fn = x => 50 * Math.sin((Math.PI / 50) * x - (1 / 2) * Math.PI) + 50
    ghost.push({ id: item.id, color: item.color, x: this.xScale(item.x), y: this.yScale(fn(item.x)), percent: item.percent, desc: item.desc, initialized: item.initialized })
    data.push({ id: item.id, color: item.color, x: this.xScale(item.x), y: this.yScale(fn(item.x)), percent: item.percent, desc: item.desc, initialized: item.initialized })
    this.reset()
  }

  deleteItem(d) {
    if (this.disabled) return;
    let { data, ghost } = this
    if (d != null) {

      this.svg
        .selectAll('.group')
        .filter(item => item.id == d.id)
        .remove()
      this.svg2
        .selectAll('.ghost')
        .filter(item => item.id == d.id)
        .remove()

      this.data = data.filter(item => item.id != d.id)
      this.ghost = ghost.filter(item => item.id != d.id)
      this.reset()
    }
  }

  resize(width) {
    const { margin } = this

    const w = this.width - margin.left - margin.right
    const w1 = width - margin.left - margin.right

    this.xScale = scaleLinear()
      .domain([0, 100])
      .range([0, w])

    this.xAxis = axisBottom(this.xScale).ticks(0)

    let rate = w1 / w
    this.width = width

    this.data.map(item => item.x = item.x * rate)
    this.ghost.map(item => item.x = item.x * rate)
    this.redraw()
  }

  disableChart(disable) {
    this.disabled = disable
  }

  enableGhost(visible) {
    this.showGhost = visible
    const fn = x => 50 * Math.sin((Math.PI / 50) * x - (1 / 2) * Math.PI) + 50
    this.svg2
      .selectAll('.ghost')
      .attr('opacity', item => {
        if (!this.showGhost) return 0;
        let d = this.data.filter(o => o.id == item.id)
        return Math.hypot(item.x - d.x, this.yScale(fn(this.xScale.invert(item.x))) - d.y) < APPEAR_GHOST_DISTANCE ? 0 : GHOST_OPACITY
      })
  }
  enableStep(enabled) {
    this.stepEnabled = enabled
  }

  reset(update) {
    let { margin, onChange, data, ghost } = this

    const fn = x => 50 * Math.sin((Math.PI / 50) * x - (1 / 2) * Math.PI) + 50

    const that = this

    const dragIt = drag().on('drag', function (d) {
      if (that.disabled) return;
      let x = event.x
      let ww = that.width - margin.left - margin.right
      if (x < 0) {
        x = 0
      } else if (x > ww) {
        x = ww
      }


      d.percent = that.stepEnabled ? Math.round(100 * x / ww) : (100 * x / ww)
      d.x = d.percent * ww / 100
      
      const inverted = that.xScale.invert(d.x)
      d.y = that.yScale(fn(inverted))
      select(this).attr('transform', `translate(${d.x}, ${d.y})`)
        .select('.item-text')
        .attr('x', d.percent > POINT_CHANGE_DIRECTION ? -CIRCLE_TEXT_DISTANCE - getTextWidth(d.desc) : CIRCLE_TEXT_DISTANCE)
        .attr('y', 5)
      select(this)
        .select('.connector')
        .attr('x2', d.percent > POINT_CHANGE_DIRECTION ? -CONNECTOR_LENGHT : CONNECTOR_LENGHT)
        .attr('y2', 0)

      that.svg
        .selectAll('.group')
        .style("fill", (item) => {
          // if (d.initialized != true) that.notInitialized = that.notInitialized - 1;
          d.initialized = true
          return item.id == d.id ? 'grey' : (item.initialized ? 'black' : 'grey')
        })
      that.svg2
        .selectAll('.ghost')
        .filter(item => item.id == d.id)
        .attr('opacity', item => {
          if (!that.showGhost) return 0;
          return Math.hypot(item.x - d.x, that.yScale(fn(that.xScale.invert(item.x))) - d.y) < APPEAR_GHOST_DISTANCE ? 0 : GHOST_OPACITY
        })

      that.data.find(item => item.id == d.id).initialized = true

    })
      .on('end', function (d) {
        if ( d.x <= 0.1 ) d.initialized = false

        let clusters = []
        that.data.map((o, idx) => {

          clusters.push({
            items: [idx],
            min_x: o.percent,
            max_x: o.percent,
            center_y: o.y
          })
          o.offset_y = 0
        })
        clusters.sort((a, b) => a.min_x - b.min_x)
        let cur = 0;
        const TEXT_HEIGHT = 14;
        while (cur < clusters.length - 1) {
          let A = clusters[cur], B = clusters[cur + 1]
          if (A.max_x < 0.1 || A.max_x < B.min_x - 10 || A.max_x < POINT_CHANGE_DIRECTION && B.min_x >= POINT_CHANGE_DIRECTION) {
            cur = cur + 1;
            continue;
          }


          let distance = Math.abs(A.center_y - B.center_y);
          let ABcount = A.items.length + B.items.length
          if (distance < ABcount * TEXT_HEIGHT / 2) {

            A.min_x = Math.min(A.min_x, B.min_x)
            A.max_x = Math.max(A.max_x, B.max_x)
            A.center_y = (A.center_y * A.items.length + B.center_y * B.items.length) / ABcount
            A.items = [...A.items, ...B.items]
            clusters.splice(cur + 1, 1);
            if (cur > 0) cur = cur - 1;
            continue
          }
          cur = cur + 1
        }

        clusters.map(o => {
          if (o.items.length == 1) return;
          let min_y = o.center_y - TEXT_HEIGHT * (o.items.length - 1) / 2;
          let max_y = o.center_y + TEXT_HEIGHT * (o.items.length - 1) / 2;
          if (that.data[o.items[0]].y < that.data[o.items[o.items.length - 1]].y) {
            o.items.map((it, idx) => that.data[it].offset_y = min_y + TEXT_HEIGHT * idx - that.data[it].y)
          } else {
            o.items.map((it, idx) => that.data[it].offset_y = max_y - TEXT_HEIGHT * idx - that.data[it].y)
          }
        })

        let cnt = 0;
        that.svg
          .selectAll('.group')
          .style("fill", (item) => {
            return item.id == d.id ? 'red' : (item.initialized ? 'black' : 'grey')
          })
          .filter(item => item.x < 0.1)
          .attr('transform', item => {
            cnt = cnt + 1
            return `translate(${item.x}, ${that.yScale(fn(that.xScale.invert(item.x))) - (cnt - 1) * ITEM_LINE_HEIGHT})`
          })

        var t = transition()
          .duration(300)
        that.svg
          .selectAll('.group')
          .select('.item-text')
          .transition(t)
          .attr('x', d => d.percent > POINT_CHANGE_DIRECTION ? -CIRCLE_TEXT_DISTANCE - getTextWidth(d.desc) : CIRCLE_TEXT_DISTANCE)
          .attr('y', d => d.offset_y + 5)
        that.svg
          .selectAll('.group')
          .select('.connector')
          .transition(t)
          .attr('x2', d => d.percent > POINT_CHANGE_DIRECTION ? -CONNECTOR_LENGHT : CONNECTOR_LENGHT)
          .attr('y2', d => d.offset_y)

        if (onChange) {
          onChange(d)
        }
      })

    if (update) {

      that.svg
        .selectAll('.group')
        .filter(item => item.initialized == true)
        .attr('transform', item => {
          return `translate(${item.x}, ${that.yScale(fn(that.xScale.invert(item.x)))})`
        })
      that.svg2
        .selectAll('.ghost')
        .attr('transform', item => {
          return `translate(${item.x}, ${that.yScale(fn(that.xScale.invert(item.x)))})`
        })
    }



    //=======For Ghost=====
    const ghosts = this.svg2
      .selectAll('.ghost')
      .data(ghost)
      .enter()
      .append('g')
      .attr('class', 'ghost')
      .attr('transform', (d) => {
        // d.x = that.xScale(d.x)
        // d.y = that.yScale(d.y)
        return `translate(${d.x}, ${d.y})`
      })
      .style('fill', 'grey')
      .attr('opacity', 0)
    ghosts
      .append('circle')
      .attr('fill', d => d.color)
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', 8)
    ghosts
      .append('line')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', d => d.percent > POINT_CHANGE_DIRECTION ? -CONNECTOR_LENGHT : CONNECTOR_LENGHT)
      .attr('y2', 0)
      .attr('fill', d => d.color)
      .attr('class', 'connector')
      .style('stroke', d => d.color)

    ghosts
      .append('text')
      .attr('class', 'item-text')
      .text(d => d.desc)
      .attr('x', d => d.percent > POINT_CHANGE_DIRECTION ? -CIRCLE_TEXT_DISTANCE - getTextWidth(d.desc) : CIRCLE_TEXT_DISTANCE)
      .attr('y', 5)
      .style('font-size', '13px')
      .style('font-family', 'sans-serif')

    //=========For Items========
    const group = this.svg
      .selectAll('.group')
      .data(data)
      .enter()
      .append('g')
      .attr('class', 'group')
      .attr('transform', (d) => {
        // console.log(d, d.x, d.y)
        // d.y = d.y - that.notInitialized * ITEM_LINE_HEIGHT

        // if (d.initialized != true) {
        //   that.notInitialized = that.notInitialized + 1;
        // }
        return `translate(${d.x}, ${d.y- that.notInitialized * ITEM_LINE_HEIGHT})`
      })
      .style('fill', 'grey')
      .call(dragIt)



    group
      .append('circle')
      .attr('fill', d => d.color)
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', 8)
    group
      .append('line')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', d => d.percent > POINT_CHANGE_DIRECTION ? -CONNECTOR_LENGHT : CONNECTOR_LENGHT)
      .attr('y2', 0)
      .attr('fill', d => d.color)
      .attr('class', 'connector animation')
      .style('stroke', d => d.color)

    group
      .append('text')
      .attr('class', 'item-text animation')
      .text(d => d.desc)
      .attr('x', d => d.percent > POINT_CHANGE_DIRECTION ? -CIRCLE_TEXT_DISTANCE - getTextWidth(d.desc) : CIRCLE_TEXT_DISTANCE)
      .attr('y', 5)
      .style('font-size', '13px')
      .style('font-family', 'sans-serif')

    group.on('click', (d) => {
      this.svg
        .selectAll('.group')
        .style("fill", (item) => {
          // if (item.initialized != true) that.notInitialized = that.notInitialized - 1;
          return item.id == d.id ? 'red' : (item.initialized ? 'black' : 'grey')
        })
      that.data.find(item => item.id == d.id).initialized = true
      if (onChange) {
        onChange(d)
      }
    })


  }


  init() {
    const { width, height, margin, target } = this

    const w = width - margin.left - margin.right
    const h = height - margin.top - margin.bottom

    this.svg = select(target)
      .append('svg')
      .attr('id', 'hcc-svg')
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('class', 'window')
      .attr('transform', `translate(${margin.left}, ${margin.top})`)
    this.svg2 = select('svg')
      .append('g')
      .attr('class', 'window2')
      .attr('transform', `translate(${margin.left}, ${margin.top})`)
      .lower()

    this.xScale = scaleLinear()
      .domain([0, 100])
      .range([0, w])

    this.xAxis = axisBottom(this.xScale).ticks(0)

    this.svg
      .append('g')
      .attr('class', 'x axis x-axis')
      .attr('transform', `translate(0, ${h + 10})`)
      .call(this.xAxis)

    this.yScale = scaleLinear()
      .domain([0, 100])
      .range([h, 0])



    const fn = x => 50 * Math.sin((Math.PI / 50) * x - (1 / 2) * Math.PI) + 50
    const lineData = range(0, 100, 0.1).map(i => ({
      x: i,
      y: fn(i)
    }))

    this.line = line()
      .x(d => this.xScale(d.x))
      .y(d => this.yScale(d.y))

    this.svg
      .append('path')
      .attr('class', 'line')
      .datum(lineData)
      .attr('d', this.line)

    this.reset()

    this.svg
      .append('line')
      .attr('class', 'middle')
      .attr('x1', this.xScale(50))
      .attr('y1', this.yScale(0))
      .attr('x2', this.xScale(50))
      .attr('y2', this.yScale(100))

    this.svg
      .append('text')
      .attr('class', 'text left-text')
      .text('Figuring things out')
      .attr('x', this.xScale(25))
      .attr('y', h + 35)
      .style('fill', 'black')
      .style("font-size", "12px")

    this.svg
      .append('text')
      .attr('class', 'text right-text')
      .text('Making it happen')
      .attr('x', this.xScale(75))
      .attr('y', h + 35)
      .style('fill', 'black')
      .style("font-size", "12px")
  }

  getValue(id) {
    if (id != null) {
      return this.data.filter(item => item.id == id)
    }
    return this.data
  }

  redraw() {
    const { width, height, margin } = this

    const w = width - margin.left - margin.right
    const h = height - margin.top - margin.bottom

    this.svg = select('#hcc-svg')
      .attr('width', width)
      .attr('height', height)
      .select('.window')
      .attr('transform', `translate(${margin.left}, ${margin.top})`)
    this.svg2 = select('svg')
      .select('.window2')
      .attr('transform', `translate(${margin.left}, ${margin.top})`)

    this.xScale = scaleLinear()
      .domain([0, 100])
      .range([0, w])

    this.xAxis = axisBottom(this.xScale).ticks(0)

    this.svg
      .select('.x-axis')
      .attr('transform', `translate(0, ${h + 10})`)
      .call(this.xAxis)

    this.yScale = scaleLinear()
      .domain([0, 100])
      .range([h, 0])

    const fn = x => 50 * Math.sin((Math.PI / 50) * x - (1 / 2) * Math.PI) + 50
    const lineData = range(0, 100, 0.1).map(i => ({
      x: i,
      y: fn(i)
    }))

    this.line = line()
      .x(d => this.xScale(d.x))
      .y(d => this.yScale(d.y))

    this.svg
      .select('.line')
      .datum(lineData)
      .attr('d', this.line)

    this.reset(true)

    this.svg
      .select(".middle")
      .attr('x1', this.xScale(50))
      .attr('y1', this.yScale(0))
      .attr('x2', this.xScale(50))
      .attr('y2', this.yScale(100))

    this.svg
      .select('.left-text')
      .attr('x', this.xScale(25))
      .attr('y', h + 35)
      .style('font-family', 'sans-serif')

    this.svg
      .select('.right-text')
      .attr('x', this.xScale(75))
      .attr('y', h + 35)
      .style('font-family', 'sans-serif')
  }
}
