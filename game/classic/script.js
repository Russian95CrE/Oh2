const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(window.location.search);

// Player Class
class Player {
    constructor(x, y, width, height, color) {
        this.initialX = x;
        this.initialY = y;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.speed = 5;
        this.color = color || 'black';
        this.velocityX = 0;
        this.velocityY = 0;
        this.isJumping = false;
        this.gravity = 0.5;
        this.initialGravity = this.gravity;
        this.friction = 0.7;
        this.jumpStrength = -10;
        this.grounded = false;
        this.hasKey = false;
        this.alerted = false;
        this.canMove = true;
        this.timePassed = false;
        this.inverted = false;
    }

    reset() {
        this.x = this.initialX;
        this.y = this.initialY;
        this.velocityX = 0;
        this.velocityY = 0;
        this.grounded = false;
        this.gravity = this.initialGravity;
        this.hasKey = false;
        this.alerted = false;
        this.isJumping = false;
        this.timePassed = false;
        this.inverted = false;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    update(keys, platforms) {
        if (this.canMove) {
            // Define moving right and left
            const movingRight = keys['ArrowRight'] || keys['d'] || keys['D'];
            const movingLeft = keys['ArrowLeft'] || keys['a'] || keys['A'];

            if (movingRight) {
                this.velocityX = this.speed;
            } else if (movingLeft) {
                this.velocityX = -this.speed;
            } else {
                this.velocityX *= this.friction;
                if (Math.abs(this.velocityX) < 0.1) this.velocityX = 0;
            }
        }

        // Apply gravity
        this.velocityY += this.gravity;

        // Move horizontally
        this.x += this.velocityX;
        this.handleHorizontalCollisions(platforms);

        // Move vertically
        this.y += this.velocityY;
        this.handleVerticalCollisions(platforms);
    }

    handleHorizontalCollisions(platforms) {
        platforms.forEach(platform => {
            if ((platform.type === 'normal' || platform.type === 'disappear') && isColliding(this, platform)) {
                if (this.velocityX > 0) {
                    this.x = platform.x - this.width;
                } else if (this.velocityX < 0) {
                    this.x = platform.x + platform.width;
                }
                this.velocityX = 0;
            }
        });

        // Prevent player from leaving the canvas horizontally
        if (this.x <= 0) {
            this.x = 0;
            this.velocityX = 0;
        }
        if (this.x + this.width >= canvas.width) {
            this.x = canvas.width - this.width;
            this.velocityX = 0;
        }
    }

    handleVerticalCollisions(platforms) {
        this.grounded = false;

        platforms.forEach(platform => {
            if ((platform.type === 'normal') && isColliding(this, platform)) {
                if (this.gravity > 0) { // Normal gravity
                    if (this.velocityY > 0) { // Falling down
                        this.y = platform.y - this.height;
                        this.velocityY = 0;
                        this.grounded = true;
                        this.isJumping = false;
                        this.isUnderground = false;
                    } else if (this.velocityY < 0) { // Jumping up
                        this.y = platform.y + platform.height;
                        this.velocityY = 0;
                        this.isUnderground = true;
                    }
                } else { // Inverted gravity
                    if (this.velocityY < 0) { // Moving up towards new ground
                        this.y = platform.y + platform.height;
                        this.velocityY = 0;
                        this.grounded = true;
                        this.isJumping = false;
                        this.isUnderground = false;
                    } else if (this.velocityY > 0) { // Moving down towards ceiling
                        this.y = platform.y - this.height;
                        this.velocityY = 0;
                        this.isUnderground = true;
                    }
                }
            }
        });

        // Prevent player from falling below or above the canvas based on gravity
        if (this.gravity > 0) { // Normal gravity
            if (this.y + this.height >= canvas.height) {
                this.y = canvas.height - this.height;
                this.velocityY = 0;
                this.grounded = true;
                this.isJumping = false;
            }
        } else { // Inverted gravity
            if (this.y <= 0) {
                this.y = 0;
                this.velocityY = 0;
                this.grounded = true;
                this.isJumping = false;
            }
        }
    }

    jump() {
        if (!this.isJumping && this.grounded) {
            this.velocityY = this.jumpStrength;
            this.isJumping = true;
        }
    }
}

// Platform Class
class Platform {
    constructor(x, y, width, height, type = 'normal') {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.type = type; // 'normal', 'door', 'key'
    }

    draw(ctx) {
        switch (this.type) {
            case 'door':
                ctx.fillStyle = '#303030'; // Door color
                break;
            case 'key':
                if (!player.timePassed) {
                    ctx.fillStyle = '#E2E200'; // Key color
                } else {
                    ctx.fillStyle = '#808080'; // Canvas Color
                }
                break;
            case 'fakeKey':
                ctx.fillStyle = '#E2E201'; // Fake Key color
                break;
            case 'teleport1':
                ctx.fillStyle = '#B200FF'; // Teleport 1 color
                break;
            case 'teleport2':
                ctx.fillStyle = '#0094FF'; // Teleport 2 color
                break;
            case 'invert':
                ctx.fillStyle = '#57007F'; // Invert color
                break;
            case 'kill':
                ctx.fillStyle = '#ff0000'; // Kill color
                break;
            default:
                ctx.fillStyle = '#dcdcdc'; // Platform color
        }
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

// Level Manager
const levels = {
    level1: [
        [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1],
        [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 3, 2],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] // Ground row
    ],
    level2: [
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
        [0, 0, 0, 1, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
        [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 2],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] // Ground row
    ],
    level3: [
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] // Ground row 
    ],
    level4: [
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 3, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] // Ground row 
    ],
    level5: [
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 2, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] // Ground row 
    ],
    level6: [
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
        [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] // Ground row 
    ],
    level7: [
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 3, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] // Ground row 
    ],
    level8: [
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 2, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] // Ground row 
    ],
    level9: [
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] // Ground row
    ],
    level10: [
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 8],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 3],
        [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2],
        [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] // Ground row
    ],
    levelDebug: [
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 4, 5, 6, 7, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] // Ground row
    ]
};

// Initialize Variables
let currentLevel = 'level1';
let levelData = deepClone(levels[currentLevel]);
const tileSize = 40;
let platforms = [];
let player = new Player(50, 520, 22, 40, params.get('color') || 'black');
let keys = {};
let whatLevel = 1;
let deleteLevel = whatLevel;
let isPaused = false;
let isLoadingLevel = false;
let time = 30.000; // Level 1 time
let intitalTime = time;
let winTime = 0.000;
let isGameOver = false;

// Audio
const jumpSound = new Audio('resource/jump.wav');
const shakeSound = new Audio('resource/shake.wav');
const doorSound = new Audio('resource/door.wav');
const keySound = new Audio('resource/key.wav')

// Utility Functions
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function isColliding(player, platform) {
    return player.x < platform.x + platform.width &&
           player.x + player.width > platform.x &&
           player.y < platform.y + platform.height &&
           player.y + player.height > platform.y;
}

// Level Loader
function loadLevel(levelName) {
    if (isLoadingLevel) return; // Prevent multiple loads
    if (!levels[levelName]) {
        console.error(`Level "${levelName}" does not exist.`);
        alert(`Level "${levelName}" does not exist.`);
        return;
    };

    deleteLevel = whatLevel - 1;

    if (deleteLevel > 0) {
        console.log('Deleting level', deleteLevel);

        try {
            delete levels[`level${deleteLevel}`];
        } catch (error) {
            console.error('Error deleting level', error);
        }
    }

    isLoadingLevel = true;
    console.log(`Loading ${levelName}...`);

    // Reset player
    player.reset();

    // Reset keys and focus
    keys = {};
    window.blur();

    // Clone level data to prevent mutations
    levelData = deepClone(levels[levelName]);

    // Generate platforms
    platforms = createPlatformsFromLevel(levelData);

    if (time > 0) {
        const levelTimes = {
            2: 15.000,
            3: 12.000,
            4: 20.000,
            5: 30.000,
            6: 40.000,
            7: 20.000,
            8: 30.000,
            9: 10.000,
            10: 20.000,
        };

        if (levelTimes[whatLevel]) {
            time = levelTimes[whatLevel];
        }
    }

    // Reset time
    document.getElementById('time').innerText = time.toFixed(3);

    // Re-enable player movement after a short delay
    setTimeout(() => {
        player.canMove = true;
        isLoadingLevel = false;
        console.log(`${levelName} loaded successfully.`);
    }, 100);
}

// Platform Generator
function createPlatformsFromLevel(level) {
    const platformsArray = [];
    for (let row = 0; row < level.length; row++) {
        for (let col = 0; col < level[row].length; col++) {
            const tile = level[row][col];
            let type = 'normal';
            if (tile === 2) type = 'door';
            if (tile === 3) type = 'key';
            if (tile === 4) type = 'fakeKey';
            if (tile === 5) type = 'teleport1';
            if (tile === 6) type = 'teleport2';
            if (tile === 7) type = 'invert';
            if (tile === 8) type = 'kill';

            if (tile !== 0) {
                platformsArray.push(new Platform(
                    col * tileSize,
                    row * tileSize,
                    tileSize,
                    tileSize,
                    type
                ));
            }
        }
    }
    return platformsArray;
}

// Drawing Functions
function drawPlatforms() {
    platforms.forEach(platform => platform.draw(ctx));
}

function drawPlayer() {
    player.draw(ctx);
}

// Handle Player Interactions
function handleInteractions() {
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;
    const playerTileX = Math.floor(playerCenterX / tileSize);
    const playerTileY = Math.floor(playerCenterY / tileSize);

    const tile = levelData[playerTileY] ? levelData[playerTileY][playerTileX] : null;

    if (tile === 2) { // Door
        if (player.hasKey && !player.alerted) {
            player.alerted = true;
            winTime = time;
            doorSound.play();
            alert('Great job! You unlocked the door with the key and won!');
            if (whatLevel < 10) {
                whatLevel++;
                loadLevel(`level${whatLevel}`);
            } else {
                alert('Wait, you won the game?');
                alert('Congratulations! You have completed the game.');
                alert('(I think...)');
                alert('See you later in the next gamemode!');
                window.location.reload();
            }
        } else if (!player.hasKey) {
            shakeGameContainer();
            console.log('Player tried to open the door without a key');
        }
    }

    if (tile === 3) { // Key
        if (!player.hasKey) {
            if (!time <= 0) {
                shakeGameContainer(false);
                keySound.play();
                player.hasKey = true;
                // Remove key from the level
                levelData[playerTileY][playerTileX] = 0;
                // Regenerate platforms if necessary
                platforms = createPlatformsFromLevel(levelData);
            }
        }
    }

    if (tile === 4) { // Fake Key
        shakeGameContainer(false);
        keySound.play();
        // Remove fake key from the level
        levelData[playerTileY][playerTileX] = 0;
        // Regenerate platforms if necessary
        platforms = createPlatformsFromLevel(levelData);
    }

    if (tile === 5) { // Teleport 1
        // Find the coordinates of the teleport 2 tile
        let teleport2X, teleport2Y;
        for (let y = 0; y < levelData.length; y++) {
            for (let x = 0; x < levelData[y].length; x++) {
                if (levelData[y][x] === 6) { // Teleport 2
                    teleport2X = x;
                    teleport2Y = y;
                    break;
                }
            }
            if (teleport2X !== undefined && teleport2Y !== undefined) {
                break;
            }
        }

        // Teleport the player to the teleport 2 tile
        if (teleport2X !== undefined && teleport2Y !== undefined) {
            player.x = teleport2X * tileSize;
            player.y = teleport2Y * tileSize;
        }
    }

    if (tile === 7) { // Invert
        // Invert gravity for the player
        player.inverted = true;
        player.gravity = -player.gravity;
    }

    if (tile === 8) { // Kill
        alert('Oh no...');
        window.location.reload();
    }
}

// Shake Effect
function shakeGameContainer(shakeSoundAllowed = true) {
    const gameContainer = document.querySelector('.game-container');
    gameContainer.classList.add('shake');
    if (shakeSoundAllowed !== false) {
        shakeSound.play();
    }

    setTimeout(() => {
        gameContainer.classList.remove('shake');
    }, 500); // Duration matches CSS animation
}

// Render the game
function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPlatforms();
    drawPlayer();
}

// Update Game State
function update() {
    if (!isPaused) {
        player.update(keys, platforms);
        handleInteractions();

        if (isGameOver) {
            player.hasKey = false;
            player.timePassed = true;
        }

        // Update time
        if (!player.alerted) {
            if (time > 0) {
                time -= 0.016;

                // Convert float to string
                let timeString = time.toString();

                // Remove the '-' character from the time string
                timeString = timeString.replace('-', '');

                document.getElementById('time').innerText = parseFloat(timeString).toFixed(3);
            } else {
                document.getElementById('time').innerText = '0.000';
                alert('Time\'s up! You lost the key.');
                player.alerted = true;
                isGameOver = true;
            }
        } else {
            time = winTime;

            // Convert float to string
            let timeString = time.toString();

            // Remove the '-' character from the time string
            timeString = timeString.replace('-', '');

            document.getElementById('time').innerText = parseFloat(timeString).toFixed(3);
        }

        render();
    }
}

function resetGame() {
    player.reset();
    keys = {};
    time = intitalTime;
    loadLevel('level1');
}

// Toggle Pause
function togglePause() {
    isPaused = !isPaused;
    const pausedElement = document.getElementById('paused');
    pausedElement.style.display = isPaused ? 'block' : 'none';
}

// Initialize Game
function init() {
    loadLevel(currentLevel);
    setInterval(update, 1000 / 60); // 60 FPS
}

// Event Listeners
window.addEventListener('keydown', (e) => {
    if (e.key === 'p') {
        togglePause();
    } else if (e.key === 'q') {
        window.close();
    } else {
        if (!isLoadingLevel && player.canMove) {
            keys[e.key] = true;
            console.log(`Key down: ${e.key}, keys state:`, keys);
            if (['ArrowUp', 'w', 'W'].includes(e.key)) {
                player.jump();
                if (player.grounded && !isPaused && !player.inverted) {
                    jumpSound.play();
                }
            }
        } else {
            if (isLoadingLevel == true) {
                console.warn("Player tried to move while loading level.");
            } else if (player.canMove == false) {
                console.warn("Player tried to move while the player.canMove is false.");
            } else {
                console.error('Unknown error');
            }
        }
    }
});

window.addEventListener('keyup', (e) => {
    if (isLoadingLevel) {
        if (isLoadingLevel == true) {
            console.warn("Player tried to move while loading level.");
        } else if (player.canMove == false) {
            console.warn("Player tried to move while the player.canMove is false.");
        } else {
            console.log('Unknown error');
        }
        return;
    }

    keys[e.key] = false;

    if (player.canMove) {
        console.log(`Key up: ${e.key}, keys state:`, keys);
    }
});

// Start the game
init();