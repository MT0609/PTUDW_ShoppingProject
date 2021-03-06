const Cart = require("./../models/cart.model");
const Product = require("./../models/product.model");

const { parsePrice } = require("./../utils/statistic");

module.exports.getCart = async (req, res, next) => {
  const { user } = req;

  console.log(req.app.locals.user);

  try {
    if (user) {
      const userCart = await Cart.findOne({
        userId: user._id,
        status: "waiting",
      });

      if (!userCart) {
        req.session.cart = await Cart.create({ userId: user._id });
      } else req.session.cart = userCart;
    }

    return res.render("pages/cart", {
      msg: "success",
      user: "Get cart successful!",
    });
  } catch (error) {
    console.log(error);
    res.render("error", {
      message: "Fail to fetch cart!",
      error,
    });
  }
};

// AJAX
module.exports.addToCart = async (req, res, next) => {
  const { user } = req;
  let { cart } = req.session;
  const { slugName } = req.params;

  let flagNewItem = true;

  try {
    if (user) {
      const userCart = await Cart.findOne({
        userId: user._id,
        status: "waiting",
      });

      if (!userCart) {
        cart = await Cart.create({ userId: user._id });
      } else cart = userCart;
    }

    const product = await Product.findOne({
      slugName,
    });

    if (!product) throw new Error("Product not found!");
    const { _id, name, price, images } = product;

    for (let i = 0; i < cart.items.length; i++) {
      if (cart.items[i].name === name) {
        cart.items[i].quantity++;
        cart.items[i].total += parsePrice(price);

        flagNewItem = false;
      }
    }

    if (flagNewItem) {
      cart.items.push({
        itemId: _id,
        name,
        slugName,
        thumbnail: images[0],
        price,
        quantity: 1,
        total: parsePrice(price),
      });
    }

    cart.totalQuantity++;
    cart.totalCost += parsePrice(price);

    if (user) {
      await Cart.updateOne(
        { userId: user._id },
        {
          $set: cart,
        }
      );
    }

    console.log(cart);

    req.session.cart = cart;
    res.status(200).json({
      msg: "success",
      user: "Add to cart successful!",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      msg: "ValidatorError",
      user: error.message,
    });
  }
};

// AJAX
module.exports.putUpdate = async (req, res, next) => {
  const enumType = [-1, 1, 0];

  const { bias } = req.body;
  const { slugName } = req.params;
  const { user } = req;
  let { cart } = req.session;

  console.log(cart);

  try {
    if (user) {
      const userCart = await Cart.findOne({
        userId: user._id,
        status: "waiting",
      });

      if (!userCart) {
        cart = await Cart.create({ userId: user._id });
      } else cart = userCart;
    }

    if (!enumType.includes(bias))
      throw new Error(`Bias must be 1: inc, -1: desc or 0: del!`);

    cart.items = cart.items.map((item) => {
      if (item.slugName === slugName) {
        if (bias === 0) {
          cart.totalQuantity -= parseInt(item.quantity);
          cart.totalCost -= parseInt(item.quantity) * parsePrice(item.price);

          return null;
        }
        if (item.quantity === 1 && bias === -1) {
          cart.totalQuantity += bias;
          cart.totalCost += bias * parsePrice(item.price);
          item.quantity += bias;
          item.total += bias * parsePrice(item.price);

          return null;
        } else {
          cart.totalQuantity += bias;
          cart.totalCost += bias * parsePrice(item.price);
          item.quantity += bias;
          item.total += bias * parsePrice(item.price);
        }
      }

      return item;
    });

    cart.items = cart.items.filter((item) => item !== null);

    if (user) {
      await Cart.updateOne(
        { userId: user._id },
        {
          $set: cart,
        }
      );
    }

    console.log(cart);

    req.session.cart = cart;
    res.status(200).json({
      msg: "success",
      user: "Update cart successful!",
      data: cart,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      msg: "ValidatorError",
      user: error.message,
    });
  }
};
