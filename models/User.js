//models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
 
    //البريد الالكتروني
    email_address: {
        type: String,
        required: true,
        unique: true,
        
    },
    
    //الرقم السري للولوج الى التطبيقة
    password: {
        type: String,
        required: true,
    },

    //صورة المستخدم
    profile_picture:{
        type: String,
    },
    
    //الاسم واللقب
    name: {
        type: String,
        required: true,
    }, 
    
    //الجنس
    gender: {
        type: String,
        required: true,
    },
     
    //أرقام الهاتف الخاصة بالمستخدم
    phone_numbers: [{
        number: {
            type: Number,
            
        }
    }],


    //رقم بطاقة التعريف الوطنية
    id_card_number: {
        type: Number,
        
    },
    //تاريخ اصدار بطاقة التعريف الوطنية
    id_card_issue_date: {
        type: Date,
        
    },
    
    //رقم جواز السفر
    passport_number: {
        type: String,
        
    },
    
    //تاريخ اصدار جواز السفر
    passport_date: {
        type: Date,
        
    },
    


    //الرقم الشخصي
    id_number: {
        type: Number, 
        required: true,
        unique: true,
    },

    //رقم التعاونية
    cooperative_number: {
        type: Number,
        
    },
    
    //الرقم الموحد
    unique_id: {
        type: Number,
        
    },
    
    //الخطة الوظيفية الحالية
    current_career_plan: {
        type: String, 
    },
    
    //تاريخ التعيين بالخطة الحالية
    current_plan_start_date: {
        type: Date,
        
    },
    
    //الاقدمية في الخطة الحالية
    current_plan_seniority: {
        type: Number,
        
    },
    
    //تاريخ الحصول على الخطة الوظيفية
    career_plan_obtainment_date: {
        type: Date,
        
    },
    
    //الاقدمية في الخطة الوظيفية
    career_plan_seniority: {
        type: String,
        
    },
    
    //الرتبة
    grade: {
        type: String,
        required: true,
        
    },
    
    //تاريخ الحصول على الرتبة
    grade_obtainment_date: {
        type: Date,
        
    },
    
    //الاقدمية في الرتبة
    rank_seniority: {
        type: Number,
        
    },
    
    //تاريخ الانتداب
    appointment_date: {
        type: Date,
        
    },
    
    //الاقدمية المهنية
    professional_seniority: {
        type: Number,
        
    },
    
    //تاريخ التقاعد
    retirement_date: {
        type: Date,
        
    },
    
    //تاريخ الولادة
    date_of_birth: {
        type: Date,
       
    },
    
    //العمر
    age: {
        type: Number,
       
    },
    
    //مكان الولادة حسب الولاية
    place_of_birth_by_state: {
        type: String,
       
    },
    
    //مكان الولادة حسب المعتمدية
    place_of_birth_by_delegation: {
        type: String,
        
    },
    
    //الحالة الصحية للمستخدم
    health_status: {
        type: String,
        
    },
    
    //مسقط الرأس حسب الولاية
    place_of_origin_by_state: {
        type: String,
        
    },
    
    //مسقط الرأس حسب المعتمدية
    place_of_origin_by_delegation: {
        type: String,
        
    },
    
    //عنوان اقامة العائلة
    family_address: {
        type: String,
        
    },
    
    //الحالة العائلية
    family_status: {
        type: String,
        
    },
    
    //الوضعية المهنية للقرين
    spouse_employment_status: {
        type: String,
        
    },
    
    //مهنة القرين ومكان عمله
    spouse_occupation_and_workplace: {
        type: String,
        
    },
    
    //مكان ولادة القرين
    spouse_birth_place: {
        type: String,
        
    },
    //مسقط رأس القرين حسب الولاية
    spouse_place_of_origin_by_state: {
        type: String,
        
    },
    //مسقط رأس القرين حسب المعتمدية
    spouse_place_of_origin_by_delegation: {
        type: String,
        
    },
    //الحالة الصحية للقرين
    spouse_health_status: {
        type: String,
        
    },
    //عدد الأطفال
    children_count: {
        type: Number,
        
    },

    
    children: [{
        //اسم الطفل
        children_names: {
            type: String,
           
        },

        //تاريخ ولادة الطفل
        children_birth_dates: {
            type: Date,
           
        },

        //الوضعية العائلية للطفل
        children_status: {
            type: String,
           
        },

        //مكان دراسة او عمل الطفل
        children_education_work_places: {
            type: String,
           
        },

        //الحالة الصحية للطفل
        children_health_status: {
            type: String,
           
        }

    }],

    assigned_career_plans: [{
        //الخطط الوظيفية السابقة
        career_plan: {
            type: String,
           
        },

        //تواريخ مباشرة الخطط الوظيفية السابقة
        career_plan_start_date: {
            type: Date,
           
        }

    }],
     //ملاحظات عامة
    general_notes: {
        type: String,
        
    },

    /*isAdmin: {
        type: Boolean,
        default: false,
    },*/

    isOnline: {
        type: Boolean,
        default: false,
    },

    lastSeen: {
        type: Date,
    },

    socketid: {
        type: String,
        default: "",  // Correction ici
    },


    settings: {
        notification: {
            type: Boolean,
            default: true,
        },
        privacy: {
            type: String,
            enum: ['public', 'private', 'friends_only'],
            default: 'private'
        }
    },

    role: {
        type: String,
        enum: ['user', 'admin'], // Validation des valeurs possibles
        default: 'user', // Correction: ajout des guillemets
    }
},

{
    timestamps: true
}

);

const User = mongoose.model("user", userSchema);

module.exports = User;