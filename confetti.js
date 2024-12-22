function showConfetti() {
  const canvas = document.getElementById('confetti')
  const ctx = canvas.getContext('2d')
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight

  const confetti = []
  const confettiCount = 300
  const gravity = 0.5
  const terminalVelocity = 5
  const drag = 0.075
  const colors = [
    '#f44336',
    '#e91e63',
    '#9c27b0',
    '#673ab7',
    '#3f51b5',
    '#2196f3',
    '#03a9f4',
    '#00bcd4',
    '#009688',
    '#4CAF50',
    '#8BC34A',
    '#CDDC39',
    '#FFEB3B',
    '#FFC107',
    '#FF9800',
    '#FF5722'
  ]

  class Confetti {
    constructor(x, y) {
      this.x = x
      this.y = y
      this.w = 10 // width
      this.h = 10 // height
      this.dx = Math.random() * 10 - 5 // x velocity
      this.dy = Math.random() * -10 - 10 // y velocity
      this.twirls = Math.random() * 10
      this.color = colors[Math.floor(Math.random() * colors.length)]
    }

    update() {
      this.dy += gravity
      this.x += this.dx
      this.y += this.dy
      this.dx += this.twirls

      if (this.dy > terminalVelocity) {
        this.dy = terminalVelocity
      }

      this.dx *= 1 - drag
    }

    draw() {
      ctx.beginPath()
      ctx.moveTo(this.x, this.y)
      ctx.lineTo(this.x + this.w, this.y + this.h)
      ctx.lineTo(this.x + this.w * 2, this.y)
      ctx.lineTo(this.x + this.w, this.y - this.h)
      ctx.closePath()
      ctx.fillStyle = this.color
      ctx.fill()
    }
  }

  function initConfetti() {
    for (let i = 0; i < confettiCount; i++) {
      confetti.push(
        new Confetti(
          Math.random() * canvas.width,
          Math.random() * canvas.height
        )
      )
    }
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    confetti.forEach((confetto, index) => {
      confetto.update()
      confetto.draw()

      if (confetto.y > canvas.height) {
        confetti.splice(index, 1)
      }
    })

    if (confetti.length > 0) {
      requestAnimationFrame(render)
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }

  initConfetti()
  render()
}
