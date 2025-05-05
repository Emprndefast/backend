const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { logger, errorLogger } = require('../logs/logger');
const { sendEmail } = require('../notifications/emailService');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

// Crear usuario (registro)
exports.createUser = async (req, res) => {
    try {
        const { name, email, password, phone, role = 'vendedor' } = req.body;

        // Verificar si el usuario ya existe
        let user = await User.findOne({ $or: [{ email }, { phone }] });
        if (user) {
            return res.status(400).json({
                success: false,
                message: 'El correo electrónico o teléfono ya está registrado'
            });
        }

        // Crear nuevo usuario
        user = new User({
            name,
            email,
            phone,
            password,
            role,
            isEmailVerified: true, // Temporalmente true para pruebas
            businessId: new mongoose.Types.ObjectId(), // Crear un nuevo businessId temporal
            plan: {
                type: 'free',
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días de prueba
                features: ['all']
            }
        });

        // Encriptar contraseña
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        // Guardar usuario
        await user.save();

        // Crear token
        const payload = {
            user: {
                id: user.id,
                role: user.role
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET || 'tu_jwt_secret',
            { expiresIn: '24h' },
            (err, token) => {
                if (err) throw err;
                res.json({ 
                    success: true,
                    message: 'Usuario creado correctamente',
                    token,
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role
                    }
                });
            }
        );
    } catch (error) {
        logger.error('Error al crear usuario: %o', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear el usuario',
            error: error.message
        });
    }
};

// Login de usuario
exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Verificar si el usuario existe
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Email o contraseña incorrectos'
            });
        }

        // Verificar contraseña
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Email o contraseña incorrectos'
            });
        }

        // Verificar si el email está verificado
        if (!user.isEmailVerified) {
            return res.status(403).json({
                success: false,
                message: 'Por favor verifica tu email antes de iniciar sesión'
            });
        }

        // Crear token
        const payload = {
            user: {
                id: user.id,
                role: user.role
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET || 'tu_jwt_secret',
            { expiresIn: '24h' },
            (err, token) => {
                if (err) throw err;
                res.json({
                    success: true,
                    message: 'Login exitoso',
                    token,
                    user: {
                        id: user.id,
                        email: user.email,
                        role: user.role
                    }
                });
            }
        );
    } catch (error) {
        logger.error('Error al iniciar sesión: %o', error);
        res.status(500).json({
            success: false,
            message: 'Error al iniciar sesión',
            error: error.message
        });
    }
};

// Obtener todos los usuarios
exports.getUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json({
            success: true,
            data: users
        });
    } catch (error) {
        logger.error('Error al obtener usuarios: %o', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener usuarios',
            error: error.message
        });
    }
};

// Obtener usuario por ID
exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }
        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        logger.error('Error al obtener usuario: %o', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el usuario',
            error: error.message
        });
    }
};

// Actualizar usuario
exports.updateUser = async (req, res) => {
    try {
        const { email, role } = req.body;
        const updateData = {};
        if (email) updateData.email = email;
        if (role) updateData.role = role;

        let user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        user = await User.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true }
        ).select('-password');

        res.json({
            success: true,
            message: 'Usuario actualizado correctamente',
            data: user
        });
    } catch (error) {
        logger.error('Error al actualizar usuario: %o', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar el usuario',
            error: error.message
        });
    }
};

// Eliminar usuario
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        await User.findByIdAndRemove(req.params.id);
        res.json({
            success: true,
            message: 'Usuario eliminado correctamente'
        });
    } catch (error) {
        logger.error('Error al eliminar usuario: %o', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar el usuario',
            error: error.message
        });
    }
};

// Endpoint para verificar email
exports.verifyEmail = async (req, res) => {
  try {
    const { token, email } = req.body;
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({ email, emailVerificationToken: hashedToken, emailVerificationExpires: { $gt: Date.now() } });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Token inválido o expirado' });
    }
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();
    res.json({ success: true, message: 'Email verificado correctamente' });
  } catch (error) {
    logger.error('Error al verificar email: %o', error);
    res.status(500).json({ success: false, message: 'Error al verificar email', error: error.message });
  }
};

// Solicitar recuperación de contraseña
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }
    const resetToken = await user.generatePasswordResetToken();
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}&email=${email}`;
    await sendEmail({
      to: email,
      subject: 'Recupera tu contraseña',
      text: `Recupera tu contraseña haciendo clic en el siguiente enlace: ${resetUrl}`,
      html: `<p>Recupera tu contraseña haciendo clic en el siguiente enlace:</p><a href="${resetUrl}">${resetUrl}</a>`
    });
    res.json({ success: true, message: 'Email de recuperación enviado' });
  } catch (error) {
    logger.error('Error al solicitar recuperación de contraseña: %o', error);
    res.status(500).json({ success: false, message: 'Error al solicitar recuperación de contraseña', error: error.message });
  }
};

// Restablecer contraseña
exports.resetPassword = async (req, res) => {
  try {
    const { token, email, newPassword } = req.body;
    const user = await User.findOne({ email });
    if (!user || !user.isPasswordResetTokenValid(token)) {
      return res.status(400).json({ success: false, message: 'Token inválido o expirado' });
    }
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    res.json({ success: true, message: 'Contraseña restablecida correctamente' });
  } catch (error) {
    logger.error('Error al restablecer contraseña: %o', error);
    res.status(500).json({ success: false, message: 'Error al restablecer contraseña', error: error.message });
  }
};

// Verificar elegibilidad para período de prueba
exports.checkTrialEligibility = async (req, res) => {
    try {
        const { email, phone } = req.body;

        // Verificar si ya existe un usuario con ese email o teléfono
        const existingUser = await User.findOne({
            $or: [
                { email: email },
                { phone: phone }
            ]
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'Este correo o teléfono ya ha utilizado la prueba gratuita.',
                data: {
                    isEligible: false
                }
            });
        }

        // Si no existe, es elegible para el período de prueba
        res.json({
            success: true,
            message: 'Elegible para período de prueba',
            data: {
                isEligible: true,
                trialDays: 30,
                features: ['all']
            }
        });
    } catch (error) {
        errorLogger(error);
        res.status(500).json({
            success: false,
            message: 'Error al verificar elegibilidad para prueba',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Obtener perfil del usuario autenticado
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }
        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        logger.error('Error al obtener perfil de usuario: %o', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el perfil del usuario',
            error: error.message
        });
    }
}; 