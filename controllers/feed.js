const path = require("path");
const fs = require("fs");
const { validationResult } = require("express-validator");
const Post = require("../models/post");
const User = require("../models/user");

exports.getPosts = async (req, res, next) => {
  const currentPage = req.query.page || 1;
  const perPage = 2;
  let totalItems;

  try {
    totalItems = await Post.find().countDocuments();

    const posts = await Post.find()
      .skip((currentPage - 1) * perPage)
      .limit(perPage);
    res.status(200).json({
      message: "Posts capturados correctamente",
      posts: posts,
      totalItems: totalItems,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.createPost = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const error = new Error(
      "La validacion fallo, la informacion ingresada no es correcta"
    );
    error.statusCode = 422;
    throw error;
  }

  if (!req.file) {
    const error = new Error("No se ha agregado una imagen");
    error.statusCode = 422;
    throw error;
  }
  const imageUrl = req.file.path.replace("\\", "/");
  const title = req.body.title;
  const content = req.body.content;
  let creator;

  const post = new Post({
    title: title,
    content: content,
    imageUrl: imageUrl,
    creator: req.userId,
  });

  try {
    const postDoc = await post.save();

    const user = await User.findById(req.userId);

    creator = user;
    user.posts.push(post);
    const result = await user.save();

    res.status(201).json({
      message: "Post created succesfully",
      post: post,
      creator: { _id: creator.id, name: creator.name },
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getPost = async (req, res, next) => {
  const postId = req.params.postId;
  const post = await Post.findById(postId);

  try {
    if (!post) {
      const error = new Error("No se pudo encontrar el post");
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({ message: "Post encontrado", post: post });
  } catch (error) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.updatePost = async (req, res, next) => {
  const postId = req.params.postId;

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const error = new Error(
      "La validacion fallo, la informacion ingresada no es correcta"
    );
    error.statusCode = 422;
    throw error;
  }

  const title = req.body.title;
  const content = req.body.content;
  let imageUrl = req.body.image;

  /*Tenemos dos opciones: 
  1. El usuario no añadió una imagen en la actualizacion del post, entonces 'imageUrl' puede 
  ser encontrada en el body, ya que el frontend la envió
  2. El usuario agrega una nueva imagen en la actualizacion del post, entonces la nueva 'imageUrl' 
  es obtenida gracias al paquete multer que configura req.file con la propiedad path. 
  */

  if (req.file) {
    console.log(req.file.path);
    imageUrl = req.file.path.replace("\\", "/");
    console.log(imageUrl);
  }

  if (!imageUrl) {
    const error = new Error("No se ha encontrado el archivo");
    error.statusCode = 422;
    throw error;
  }

  try {
    const post = await Post.findById(postId);

    if (!post) {
      const error = new Error("No se pudo encontrar el post");
      error.statusCode = 404;
      throw error;
    }

    if (post.creator.toString() !== req.userId) {
      const error = new Error("No esta autorizado");
      error.statusCode = 403;
      throw error;
    }
    if (imageUrl !== post.imageUrl) {
      clearImage(post.imageUrl);
    }

    post.title = title;
    post.imageUrl = imageUrl;
    post.content = content;

    const result = await post.save();

    res.status(200).json({ message: "Post actualizado", post: result });
  } catch (error) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deletePost = async (req, res, next) => {
  const postId = req.params.postId;

  try {
    const post = await Post.findById(postId);

    if (!post) {
      const error = new Error("No se pudo encontrar el post");
      error.statusCode = 404;
      throw error;
    }
    if (post.creator.toString() !== req.userId) {
      const error = new Error("No esta autorizado");
      error.statusCode = 403;
      throw error;
    }
    //Check logged in user
    clearImage(post.imageUrl);
    const documentDeleted = await Post.findByIdAndRemove(postId);

    const user = await User.findById(req.userId);

    user.posts.pull(postId);
    const result = await user.save();

    res.status(200).json({ message: "Post eliminado" });
  } catch (error) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

const clearImage = (filePath) => {
  filePath = path.join(__dirname, "..", filePath);
  fs.unlink(filePath, (err) => {
    console.log(err);
  });
};
