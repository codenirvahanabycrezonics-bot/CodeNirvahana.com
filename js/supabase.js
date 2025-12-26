// supabase.js
const SUPABASE_URL = "https://luaglufgbllksykzgolt.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_FVi0pJg-ox5xo9jirL8ZIA_s26yY5eL";

const supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

const db = {

    async login(username, password) {
        try {
            const { data, error } = await supabase
                .from("user_auth")
                .select("*")
                .eq("user_id", username)
                .single();

            if (error || !data) {
                return { success: false, message: "Invalid username or password" };
            }

            if (data.auth_data.password !== password) {
                return { success: false, message: "Invalid username or password" };
            }

            return {
                success: true,
                user: {
                    user_id: data.user_id,
                    role: data.auth_data.role,
                    isLoggedIn: true
                }
            };

        } catch (err) {
            console.error("Login error:", err);
            return { success: false, message: "Login failed" };
        }
    },

    async setAuth(authData) {
        await supabase
            .from("user_auth")
            .update({
                auth_data: authData,
                updated_at: new Date()
            })
            .eq("user_id", authData.user_id);
    },

    async getCourses() {
        const { data } = await supabase
            .from("courses")
            .select("*")
            .order("created_at", { ascending: false });

        return data || [];
    },

    async addCourse(courseData) {
        await supabase.from("courses").insert({
            course_data: courseData
        });
    },

    async deleteCourse(id) {
        await supabase.from("courses").delete().eq("id", id);
    },

    async getNotes(courseId) {
        const { data } = await supabase
            .from("course_notes")
            .select("*")
            .eq("course_id", courseId);

        return data || [];
    },

    async saveNote(courseId, noteData) {
        await supabase.from("course_notes").insert({
            course_id: courseId,
            note_data: noteData
        });
    }
};

window.db = db;
