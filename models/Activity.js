//models/Activity.js
const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },

    general_activity: {
        type: String,
        required: true,
        enum: [
            'اجتماع',
            'تدريب', 
            'مهمة',
            'عمل عن بعد',
            'تقرير',
            'تحليل',
            'عرض',
            'تدقيق',
            'تخطيط',
            'تقييم',
            'مقابلة',
            'عمل مكتب',
            'حدث',
            'أخرى'
        ]
    },

    activity_type: {
        type: String,
        required: true,
        enum: [
            'اجتماع داخلي',
            'اجتماع خارجي', 
            'تدريب داخلي',
            'تدريب خارجي',
            'مهمة ميدانية',
            'مهمة إدارية',
            'عمل عن بعد',
            'كتابة تقرير',
            'تحليل البيانات',
            'عرض داخلي',
            'عرض خارجي',
            'تدقيق داخلي',
            'تدقيق خارجي',
            'تخطيط مشروع',
            'تخطيط فريق',
            'تقييم أداء',
            'تقييم مشروع',
            'مقابلة فردية',
            'مقابلة جماعية',
            'عمل مكتب',
            'حدث مؤسسي',
            'حدث مهني',
            'أخرى'
        ]
    },

    start_date: {
        type: Date,
        required: true
    },

    start_time: {
        type: String,
        required: true
    },

    end_date: {
        type: Date,
        required: true
    },

    end_time: {
        type: String,
        required: true
    },

    activity_subject: {
        type: String,
        required: true,
        maxlength: 500
    },

    description: {
        type: String,
        maxlength: 2000
    },

    uploads: [{
        filename: {
            type: String,
            required: true
        },
        file_url: {
            type: String,
            required: true
        },
        file_type: {
            type: String,
            enum: ['document', 'image', 'présentation', 'tableur', 'pdf', 'autre'],
            default: 'document'
        },
        file_size: {
            type: Number,
            required: true
        },
        upload_date: {
            type: Date,
            default: Date.now
        },
        // ✅ CORRECTION : Stocker le fichier en base64
        file_data: {
            type: String
        }
    }],

    notes: {
        type: String,
        maxlength: 1000
    },

    authorized_viewers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    }],

    visibility: {
        type: String,
        enum: ['خاص', 'عام', 'مستخدمين محددين'],
        default: 'خاص'
    },

    is_published: {
        type: Boolean,
        default: false
    },

    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    }],

    comments: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            required: true
        },
        content: {
            type: String,
            required: true,
            maxlength: 1000
        },
        commented_at: {
            type: Date,
            default: Date.now
        },
        likes: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "user"
        }],
        replies: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "user",
                required: true
            },
            content: {
                type: String,
                required: true,
                maxlength: 1000
            },
            replied_at: {
                type: Date,
                default: Date.now
            },
            likes: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "user"
            }]
        }]
    }],

    engagement_metrics: {
        likes_count: {
            type: Number,
            default: 0
        },
        comments_count: {
            type: Number,
            default: 0
        },
        views_count: {
            type: Number,
            default: 0
        }
    },

    identified_users: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            required: true
        },
        name: {
            type: String,
            required: true,
            default: 'مستخدم بدون اسم'
        },
        email: {
            type: String,
            default: 'email@example.com'
        },
        current: {
            type: String,
            default: 'المنصب غير محدد'
        },
        profile_picture: {
            type: String,
            default: null
        },
        current_career_plan: {
            type: String,
            default: ''
        },
        grade: {
            type: String,
            default: ''
        }
    }],

    tags: [{
        type: String,
        maxlength: 50
    }],

    status: {
        type: String,
        enum: ['مخطط', 'قيد التنفيذ', 'منتهي', 'ملغي'],
        default: 'مخطط'
    }

}, {
    timestamps: true
});

// فهارس للبحث
activitySchema.index({ activity_subject: 'text', description: 'text' });
activitySchema.index({ start_date: 1 });
activitySchema.index({ user: 1 });
activitySchema.index({ "identified_users.user": 1 });

// ✅ CORRECTION : Middleware amélioré pour la synchronisation
activitySchema.pre('save', function(next) {
    // إذا كانت الرؤية = مستخدمين محددين، انسخ معرفات المستخدمين المحددين
    if (this.visibility === 'مستخدمين محددين' && this.identified_users.length > 0) {
        this.authorized_viewers = this.identified_users.map(identifiedUser => identifiedUser.user);
    }
    // إذا كانت الرؤية = عام، أفرغ authorized_viewers (يمكن للجميع الرؤية)
    else if (this.visibility === 'عام') {
        this.authorized_viewers = [];
    }
    // إذا كانت الرؤية = خاص، فقط المؤلف يمكنه الرؤية
    else if (this.visibility === 'خاص') {
        this.authorized_viewers = [this.user];
    }
    
    // ✅ التأكد من أن جميع الحقول المطلوبة في identified_users لها قيم
    if (this.identified_users && this.identified_users.length > 0) {
        this.identified_users = this.identified_users.map(identifiedUser => {
            return {
                user: identifiedUser.user,
                name: identifiedUser.name || 'مستخدم بدون اسم',
                email: identifiedUser.email || 'email@example.com',
                current: identifiedUser.current || 'المنصب غير محدد',
                profile_picture: identifiedUser.profile_picture || null,
                current_career_plan: identifiedUser.current_career_plan || '',
                grade: identifiedUser.grade || ''
            };
        });
    }
    
    next();
});

// ✅ CORRECTION : Middleware de validation pour identified_users
activitySchema.pre('validate', function(next) {
    if (this.identified_users && this.identified_users.length > 0) {
        this.identified_users.forEach((identifiedUser, index) => {
            if (!identifiedUser.name || identifiedUser.name.trim() === '') {
                this.invalidate(`identified_users.${index}.name`, 'الاسم مطلوب');
            }
            if (!identifiedUser.email || identifiedUser.email.trim() === '') {
                this.invalidate(`identified_users.${index}.email`, 'البريد الإلكتروني مطلوب');
            }
            if (!identifiedUser.current || identifiedUser.current.trim() === '') {
                this.invalidate(`identified_users.${index}.current`, 'المنصب مطلوب');
            }
        });
    }
    next();
});

const Activity = mongoose.model("Activity", activitySchema);
module.exports = Activity;