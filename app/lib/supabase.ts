import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://creghvwvqszccsorghzn.supabase.co";

const supabaseKey = "sb_publishable_vKhrxrsSgjY9NO0q0oIvEA_R5olYCde";

export const supabase = createClient(supabaseUrl, supabaseKey);