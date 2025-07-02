Of course! Here is a concise cheatsheet for using React Hook Form with Zod. It's designed to be a quick reference for the most common patterns and concepts.

---

### **RHF + Zod Cheatsheet: The Modern React Form**

This guide assumes you have a basic understanding of React and TypeScript.

#### **1. Installation**

You need three packages: the form library, the resolver, and the schema library.

```bash
npm install react-hook-form zod @hookform/resolvers
```

---

#### **2. The 5-Step Core Pattern**

Almost every form follows this exact pattern.

```tsx
// MyFormComponent.tsx

// --- IMPORTS ---
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// --- STEP 1: Define the Schema ---
// This is your single source of truth for form shape and validation.
const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  age: z.coerce.number().min(18, "You must be 18 or older"),
  // z.coerce.number() is great for <input type="number"> which returns a string
});

// --- STEP 2: Infer the TypeScript Type ---
// This automatically creates a TS type from your schema. No manual type definitions!
type FormSchemaType = z.infer<typeof formSchema>;

export const MyFormComponent = () => {
  // --- STEP 3: Setup the Hook ---
  // Pass the schema to the resolver and connect it to useForm.
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
  });

  // --- STEP 4: Define the Submit Handler ---
  // A function that's called ONLY on successful validation.
  // It automatically receives the typed form data.
  const onSubmit: SubmitHandler<FormSchemaType> = (data) => {
    console.log(data); // { name: "John", email: "...", age: 30 }
    // await apiCall(data);
  };

  // --- STEP 5: Build the JSX ---
  return (
    // Pass your submit handler to RHF's handleSubmit.
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Name Field */}
      <div>
        <label>Name</label>
        <input type="text" {...register("name")} />
        {errors.name && <p className="error">{errors.name.message}</p>}
      </div>

      {/* Email Field */}
      <div>
        <label>Email</label>
        <input type="email" {...register("email")} />
        {errors.email && <p className="error">{errors.email.message}</p>}
      </div>

      {/* Age Field */}
      <div>
        <label>Age</label>
        <input type="number" {...register("age")} />
        {errors.age && <p className="error">{errors.age.message}</p>}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Loading..." : "Submit"}
      </button>
    </form>
  );
};
```

---

#### **3. Key `useForm` Returns**

This is what you get from `const { ... } = useForm()`.

| Return Value   | Purpose                                                                                                                                                                                             |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `register`     | A function to connect native HTML inputs (`<input>`, `<select>`, etc.) to the form. `eg: {...register("fieldName")}`                                                                                |
| `handleSubmit` | A function wrapper for your submission handler. It prevents default browser behavior, runs validation, and passes data to your function on success. `eg: onSubmit={handleSubmit(myFunc)}`           |
| `formState`    | An object containing the form's state. The most useful properties are:<br/>- `errors`: An object with validation messages.<br/>- `isSubmitting`: A boolean for disabling buttons during submission. |
| `control`      | The magic object used to connect **non-native** or **UI library components** (like Material-UI, Chakra, Date Pickers) via the `<Controller>` component.                                             |
| `watch`        | A function to "watch" a field's value and trigger a re-render when it changes. Perfect for conditional UI. `eg: const nameValue = watch("name");`                                                   |
| `getValues`    | A function to get form values **without** triggering a re-render. Useful inside functions. `eg: const allValues = getValues();`                                                                     |
| `reset`        | A function to reset the form fields to their default values or a new set of values. `eg: reset();` or `reset({ name: "Jane" });`                                                                    |
| `trigger`      | A function to manually trigger validation for one or more fields.                                                                                                                                   |
| `setValue`     | A function to programmatically set the value of a field and update its validation state.                                                                                                            |

---

#### **4. Common Zod Schema Recipes**

| Goal                        | Zod Schema Snippet                                                                                                                                                                                                                                                           |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Password & Confirmation** | `z.object({ password: z.string().min(8), confirmPassword: z.string() }).refine((data) => data.password === data.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] })`                                                                          |
| **Optional Field**          | `field: z.string().optional()` or `field: z.string().nullable()`                                                                                                                                                                                                             |
| **Dropdown/Select (Enum)**  | `plan: z.enum(['free', 'basic', 'premium'], { required_error: 'You must select a plan' })`                                                                                                                                                                                   |
| **Checkbox (boolean)**      | `terms: z.literal(true, { errorMap: () => ({ message: "You must accept the terms" }) })`                                                                                                                                                                                     |
| **File Upload (basic)**     | `profilePicture: z.instanceof(FileList).refine(files => files?.length == 1, 'File is required.')`                                                                                                                                                                            |
| **Conditional Field**       | `z.object({ subscribe: z.boolean(), newsletter: z.string().optional() }).refine((data) => { if (data.subscribe) { return data.newsletter && data.newsletter.length > 0; } return true; }, { message: 'Newsletter name is required when subscribed', path: ['newsletter'] })` |
| **Transforming Data**       | `tags: z.string().transform(val => val.split(',').map(s => s.trim()))`                                                                                                                                                                                                       |

---

#### **5. Integrating UI Library Components (with `<Controller>`)**

Use `<Controller>` when `register` doesn't work (e.g., Material-UI, React-Select, custom components).

```tsx
import { Controller } from "react-hook-form";
import ReactDatePicker from "react-datepicker"; // Example library

// ... inside your component
const {
  control,
  formState: { errors },
} = useForm(/* ... */);

return (
  <div>
    <label>Birth Date</label>
    <Controller
      control={control} // 1. Pass control
      name="birthDate" // 2. The name in your Zod schema
      render={(
        { field } // 3. Render prop gives you `field`
      ) => (
        <ReactDatePicker
          // 4. Map the `field` properties to the component's props
          onChange={field.onChange}
          onBlur={field.onBlur}
          selected={field.value}
          ref={field.ref}
        />
      )}
    />
    {errors.birthDate && <p className="error">{errors.birthDate.message}</p>}
  </div>
);
```
