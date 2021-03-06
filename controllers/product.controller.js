const mongoose = require("mongoose");
const slug = require("slug");

const User = require("../models/user.model");
const Product = require("../models/product.model");

const { allCategory } = require("./../utils/constant");
const { statistic, parsePrice } = require("./../utils/statistic");

module.exports.getResourceProducts = async (req, res, next) => {
  const { resourceSlugName } = req.params;
  const { producer } = req.query;

  // Filter and sort
  const { search = "", sort = "asc", min = 0, max = 100000000 } = req.query;

  const validResourceSlugName = allCategory.map((cate) => cate.slugName);

  try {
    if (!validResourceSlugName.includes(resourceSlugName)) {
      throw new Error("Invalid url!");
    }

    let mapValue = allCategory.find(
      (cate) => cate.slugName === resourceSlugName
    );

    const objQuery = {
      type: mapValue.name,
    };

    const query = {};
    query.search = search || "";

    // Query
    const searchSlug = slug(search);
    const regex = new RegExp(searchSlug, "i");
    objQuery.slugName = regex;

    if (producer) {
      objQuery["producer"] = producer;
    }

    let result = await Product.find(objQuery).limit(12);

    // Sort
    if (sort === "asc") {
      result = result.sort((a, b) => {
        return parsePrice(a.price) - parsePrice(b.price);
      });
    } else {
      result = result.sort((a, b) => {
        return -parsePrice(a.price) + parsePrice(b.price);
      });
    }

    // Filter

    const statisticPerType = await statistic(
      Product,
      { type: mapValue.name },
      "producer"
    );

    if (statisticPerType.length > 9) statisticPerType.length = 9;

    res.render("pages/products", {
      msg: "success",
      data: result || null,
      query: query,
      ourBrands: statisticPerType || null,
    });
  } catch (error) {
    res.render("error", {
      message: error.message,
      error,
    });
  }
};

// AJAX
module.exports.getStatisticProducer = async (req, res, next) => {
  const validType = ["computer", "laptop", "mobile"];
  const { type } = req.params;

  try {
    if (!validType.includes(type))
      throw new Error("Invalid value of param type!");

    const result = await Product.find({ type });
    if (!result) throw new Error("No item found for this resource!");

    const producer = result.map((product) => {
      product.producer;
    });

    const statisticProducer = Array.from(new Set(producer)).map((pro) => ({
      pro: producer.filter((pro2) => pro2 === pro).length,
    }));
    console.log(statisticProducer);

    res.status(200).json({
      msg: "success",
      user: "Fetch statistic producers base on type successful!",
      data: statisticProducer,
    });
  } catch (error) {
    console.log(error);
    res.status(205).json({
      msg: "ValidatorError",
      user: error.message,
    });
  }
};

// AJAX
module.exports.postCreate = async (req, res, next) => {
  const {
    name,
    price,
    type,
    quantity,
    details,
    description,
    producer,
  } = req.body;

  let arrThumbnail = req.files.length ? req.files : [];
  arrThumbnail = arrThumbnail.map((thumbnail) => {
    req.hostname + "/" + thumbnail.path.replace(/\\/g, "/").replace("..", "");
  });

  try {
    const product = new Product({
      name,
      price,
      type,
      quantity,
      details,
      description,
      producer,
      thumbnail: arrThumbnail,
    });

    const result = await product.save();

    res.status(201).json({
      msg: "success",
      user: "Create a new product successful!",
      data: result,
    });
  } catch (error) {
    // let respond = { msg: "ValidatorError" };
    // error.errors &&
    //   Object.keys(error.errors).forEach(
    //     (err) => (respond[err] = error.errors[err].message)
    //   );

    console.log(error);
    res.status(205).json({
      msg: "ValidatorError",
      user: error.message,
    });
  }
};

// AJAX
module.exports.patchUpdate = async (req, res, next) => {
  const acceptUserFields = [
    "name",
    "price",
    "type",
    "quantity",
    "details",
    "descriptions",
    "producer",
    "tags",
    "video",
  ];

  const { id } = req.params;
  const { user } = req;
  const keys = Object.keys(req.body);
  let hasPrice = false;
  let newProduct = {};

  try {
    if (user.role !== "admin")
      throw new Error(`You don't have the permission!`);

    for (const ops of keys) {
      if (acceptUserFields.includes(ops)) {
        newProduct[ops] = req.body.ops;
      } else {
        throw new Error(
          "You are only allowed to change the {name}, {price}, {type}, {quantity}, {details}, {descriptions}, {producer}, {tags}, {video}!"
        );
      }

      if (ops === "price") {
        hasPrice = true;
      }
    }

    if (hasPrice) {
      const product = await Product.findById(id);
      newProduct.oldPrice = product.price;
    }

    const result = await Product.updateOne(
      { _id: id },
      { $set: newProduct },
      { runValidators: true }
    );

    res.status(200).json({
      msg: "success",
      user: "Product updated!",
      data: result,
    });
  } catch (error) {
    console.log(error),
      res.status(205).json({
        msg: "ValidatorError",
        user: error.message,
      });
  }
};

// AJAX
module.exports.deleteOne = async (req, res, next) => {
  const _id = req.params.id;

  try {
    await Product.deleteOne({ _id });

    res.status(200).json({
      msg: "success",
      user: "Delete product successful!",
    });
  } catch (error) {
    console.log(error);
    res.status(205).json({
      msg: "ValidatorError",
      user: error.message,
    });
  }
};

// AJAX
module.exports.getRelative = async (req, res, next) => {
  const { id } = req.params;

  try {
    const product = await Product.findById(id);
    const { type, tags, producer } = product;

    const result = await Product.find({
      $or: [
        {
          type: {
            $in: type,
          },
        },
        {
          producer: {
            $in: producer,
          },
        },
        {
          tags: {
            $in: tags,
          },
        },
      ],
    });

    res.status(200).json({
      msg: "success",
      user: `Get relative product successful!`,
      data: result,
    });
  } catch (error) {
    console.log(error);
    res.status(205).json({
      msg: "ValidatorError",
      user: error.message,
    });
  }
};

// AJAX
module.exports.getAllComment = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const items_per_page = parseInt(req.query.limit) || 100;

  if (page < 1) page = 1;

  await Product.find({})
    .sort(sortObj)
    .skip((page - 1) * items_per_page)
    .limit(items_per_page)
    .then(async (products) => {
      const request = {};
      const len = await Product.find({}).count();

      request.currentPage = page;
      request.totalPages = Math.ceil(len / items_per_page);

      if (page > 1) {
        request.previous = {
          page: page - 1,
          limit: items_per_page,
        };
      }

      if (page * items_per_page < len) {
        request.next = {
          page: page + 1,
          limit: items_per_page,
        };
      }

      res.status(200).json({
        msg: "success",
        user: "Fetch comments successful!",
        data: products.comments,
      });
    })
    .catch((error) => {
      console.log(error);
      res.status(205).json({
        msg: "ValidatorError",
        user: error.message,
      });
    });
};

// AJAX
module.exports.postComment = async (req, res, next) => {
  const { productSlugName } = req.params;
  const { name, email, review } = req.body;
  const { user } = req;

  try {
    const comment = {
      name,
      email,
      review,
      date: new Date(),
    };

    if (!user) {
      comment.userId = mongoose.Types.ObjectId();
    } else {
      comment.userId = user._id;
    }

    await Product.updateOne(
      { slugName: productSlugName },
      {
        $push: {
          comments: comment,
        },
      }
    );

    console.log(comment);

    res.status(201).json({
      msg: "success",
      user: `Your comment has been public!`,
      data: comment,
    });
  } catch (error) {
    console.log(error);
    res.status(205).json({
      msg: "ValidatorError",
      user: error.message,
    });
  }
};

// AJAX
module.exports.postLike = async (req, res, next) => {
  const { id } = req.params;
  const { user } = req;

  try {
    const product = await Product.findById(id);
    const { name, price, thumbnail } = product;

    if (!user) {
      req.session.like.push({
        productId: id,
        name: name,
        price: price,
        thumbnail: thumbnail,
      });

      return res.status(200).json({
        msg: "success",
        user: "Add to like resources successful!",
      });
    }

    const { _id } = user;

    // Bug: check 2 likes ???
    product.countLike++;

    await Promise.all([
      Product.updateOne(
        { _id: id },
        {
          $set: product,
        }
      ),
      User.updateOne(
        { _id },
        {
          $push: {
            likes: {
              productId: id,
              name: name,
              price: price,
              thumbnail: thumbnail,
            },
          },
        }
      ),
    ]);

    res.status(200).json({
      msg: "success",
      user: "Like product successful!",
    });
  } catch (error) {
    console.log(error);
    res.status(205).json({
      msg: "ValidatorError",
      user: error.message,
    });
  }
};
