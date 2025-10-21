// controllers/uploadController.js
const uploadFiles = async (req, res) => {
  try {
      console.log('📁 uploadFiles called - Files:', req.files);
      console.log('📁 uploadFiles called - Body:', req.body);
      console.log('📁 uploadFiles called - User:', req.user.id);

      if (!req.files || req.files.length === 0) {
          return res.status(400).json({
              success: false,
              error: "Aucun fichier uploadé"
          });
      }

      // Traiter chaque fichier uploadé
      const uploadedFiles = req.files.map(file => {
          // Déterminer le type de message basé sur le mimetype
          let messageType = 'file';
          if (file.mimetype.startsWith('image/')) {
              messageType = 'image';
          } else if (file.mimetype.startsWith('video/')) {
              messageType = 'video';
          } else if (file.mimetype.startsWith('audio/')) {
              messageType = 'audio';
          }

          return {
              filename: file.filename,
              originalname: file.originalname,
              mimetype: file.mimetype,
              size: file.size,
              url: `http://localhost:9843/uploads/${file.filename}`,
              messageType: messageType
          };
      });

      console.log('✅ Files processed successfully:', uploadedFiles.length);

      res.status(200).json({
          success: true,
          message: "Fichiers uploadés avec succès",
          data: {
              files: uploadedFiles,
              count: uploadedFiles.length
          }
      });

  } catch (error) {
      console.error("❌ uploadFiles error:", error);
      res.status(500).json({
          success: false,
          error: "Erreur lors de l'upload des fichiers"
      });
  }
};

module.exports = { uploadFiles };