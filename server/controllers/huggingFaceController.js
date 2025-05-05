const axios = require('axios');

const huggingFaceController = {
  generateResponse: async (req, res) => {
    try {
      const { prompt } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: 'El prompt es requerido' });
      }

      const response = await axios.post(
        'https://api-inference.huggingface.co/models/google/flan-t5-large',
        { inputs: prompt },
        {
          headers: {
            'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      res.json(response.data);
    } catch (error) {
      console.error('Error en Hugging Face:', error.response?.data || error.message);
      res.status(500).json({ 
        error: 'Error al procesar la solicitud',
        details: error.response?.data || error.message 
      });
    }
  }
};

module.exports = huggingFaceController; 