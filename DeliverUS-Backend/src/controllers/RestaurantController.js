import { Restaurant, Product, RestaurantCategory, ProductCategory, sequelizeSession } from '../models/models.js'

const statusOrder = ['online', 'offline', 'closed', 'temporarily closed']

// Función para construir el CASE de ordenación dinámicamente
const buildStatusOrderCase = (statuses) => {
  return statuses.map((status, index) => `WHEN '${status}' THEN ${index + 1}`).join(' ')
}
const index = async function (req, res) {
  try {
    const restaurants = await Restaurant.findAll(
      {
        attributes: { exclude: ['userId'] },
        include:
      {
        model: RestaurantCategory,
        as: 'restaurantCategory'
      },
        order: [[{ model: RestaurantCategory, as: 'restaurantCategory' }, 'name', 'ASC']]
      }
    )
    res.json(restaurants)
  } catch (err) {
    res.status(500).send(err)
  }
}

const indexOwner = async function (req, res) {
  try {
    const restaurants = await Restaurant.findAll(
      {
        attributes: { exclude: ['userId'] },
        where: { userId: req.user.id },
        order: [
          [sequelizeSession.literal(`CASE status ${buildStatusOrderCase(statusOrder)} END`), 'ASC'],
          ['name', 'ASC']
        ],
        include: [{
          model: RestaurantCategory,
          as: 'restaurantCategory'
        }]
      })
    res.json(restaurants)
  } catch (err) {
    res.status(500).send(err)
  }
}

const create = async function (req, res) {
  const newRestaurant = Restaurant.build(req.body)
  newRestaurant.userId = req.user.id // usuario actualmente autenticado
  try {
    const restaurant = await newRestaurant.save()
    res.json(restaurant)
  } catch (err) {
    res.status(500).send(err)
  }
}

const show = async function (req, res) {
  // Only returns PUBLIC information of restaurants
  try {
    const restaurant = await Restaurant.findByPk(req.params.restaurantId, {
      attributes: { exclude: ['userId'] },
      include: [{
        model: Product,
        as: 'products',
        include: { model: ProductCategory, as: 'productCategory' }
      },
      {
        model: RestaurantCategory,
        as: 'restaurantCategory'
      }],
      order: [[{ model: Product, as: 'products' }, 'order', 'ASC']]
    }
    )
    res.json(restaurant)
  } catch (err) {
    res.status(500).send(err)
  }
}

const update = async function (req, res) {
  try {
    await Restaurant.update(req.body, { where: { id: req.params.restaurantId } })
    const updatedRestaurant = await Restaurant.findByPk(req.params.restaurantId)
    res.json(updatedRestaurant)
  } catch (err) {
    res.status(500).send(err)
  }
}

const destroy = async function (req, res) {
  try {
    const result = await Restaurant.destroy({ where: { id: req.params.restaurantId } })
    let message = ''
    if (result === 1) {
      message = 'Sucessfuly deleted restaurant id.' + req.params.restaurantId
    } else {
      message = 'Could not delete restaurant.'
    }
    res.json(message)
  } catch (err) {
    res.status(500).send(err)
  }
}

const online = async function (req, res) {
  const t = await sequelizeSession.transaction()
  try {
    const restaurante = await Restaurant.findByPk(req.params.restaurantId)
    if (restaurante.status === 'offline') {
      console.log('is offline')
      await Restaurant.update(
        { status: 'online' },
        { where: { id: req.params.restaurantId } },
        { transaction: t }
      )
    } else if (restaurante.status === 'online') {
      console.log('is online')
      await Restaurant.update(
        { status: 'offline' },
        { where: { id: req.params.restaurantId } },
        { transaction: t }
      )
    }
    t.commit()
    const restaurant = await Restaurant.findByPk(req.params.restaurantId)

    res.json(restaurant)
  } catch (err) {
    t.rollback()
    res.status(500).send(err)
  }
}

const RestaurantController = {
  index,
  indexOwner,
  create,
  show,
  update,
  destroy,
  online
}
export default RestaurantController
