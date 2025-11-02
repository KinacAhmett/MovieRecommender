// controllers/authController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// JWT token oluşturma
const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// Kullanıcı kaydı
const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Validasyon
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Tüm alanlar zorunludur'
            });
        }

        // Kullanıcı var mı kontrol et
        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Kullanıcı zaten mevcut'
            });
        }

        // Şifreyi hash'le
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Kullanıcı oluştur
        const user = await User.create({
            username,
            email,
            password: hashedPassword
        });

        // Token oluştur
        const token = generateToken(user._id);

        res.status(201).json({
            success: true,
            message: 'Kullanıcı başarıyla oluşturuldu',
            data: {
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email
                },
                token
            }
        });

    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası'
        });
    }
};

// Kullanıcı girişi
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email ve şifre zorunludur'
            });
        }

        // Kullanıcıyı bul
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Geçersiz email veya şifre'
            });
        }

        // Şifreyi kontrol et
        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            return res.status(401).json({
                success: false,
                message: 'Geçersiz email veya şifre'
            });
        }

        // Güncelle ve token oluştur
        user.lastLogin = new Date();
        await user.save();

        const token = generateToken(user._id);

        res.json({
            success: true,
            message: 'Giriş başarılı',
            data: {
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    preferences: user.preferences
                },
                token
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası'
        });
    }
};

// Profil getir
const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password');
        
        res.json({
            success: true,
            data: { user }
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası'
        });
    }
};

module.exports = {
    register,
    login,
    getProfile
};