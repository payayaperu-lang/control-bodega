import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://creghvwvqszccsorghzn.supabase.co";

const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyZWdodnd2cXN6Y2Nzb3JnaHpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MzA3NjMsImV4cCI6MjA5MjMwNjc2M30.iqN2KpToCFVxjrC784WfPkeVuw6CzM7v73-xE8uNqOI";

export const supabase = createClient(supabaseUrl, supabaseKey);