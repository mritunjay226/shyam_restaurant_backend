import { mutation } from "./_generated/server";

export const seed = mutation({
  handler: async (ctx) => {
    // 0. WIPE EXISTING DATA to prevent duplicates
    const existingCats = await ctx.db.query("categories").collect();
    for (const cat of existingCats) await ctx.db.delete(cat._id);
    
    const existingItems = await ctx.db.query("banquetMenuItems").collect();
    for (const item of existingItems) await ctx.db.delete(item._id);

    // 1. Define Categories
    const categoryNames = [
      "Breakfast", "Mocktail", "Coffee", "Cold Brews", "Teas", "Maggi", 
      "Other Starters", "Pasta", "Pizzeria", "Garlic Bread", "Burgers / Sandwiches",
      "Noodles", "Rice", "Chinese Main Course", "Sides", "Soup Bowls", 
      "Tandoori Snacks", "Indian Main Course", "Indian Breads", "Salads & Raita", 
      "Mithai & Meetha", "Ice Cream & Sundaes"
    ];

    const categoryIdMap = new Map<string, any>();

    // Insert categories and store their IDs
    for (const [index, name] of categoryNames.entries()) {
      const id = await ctx.db.insert("categories", {
        name,
        sortOrder: index,
      });
      categoryIdMap.set(name, id);
    }

    // 2. Define Menu Items
    const banquetMenuItems = [
      // BREAKFAST (Note: No prices in document, assuming 0 for complimentary/buffet)
      { cat: "Breakfast", name: "Hot Milk with Cornflakes", price: 0, dietaryType: "veg", availabilityWindow: "7:00 AM - 10:30 AM" },
      { cat: "Breakfast", name: "Green Tea", price: 0, dietaryType: "veg", availabilityWindow: "7:00 AM - 10:30 AM" },
      { cat: "Breakfast", name: "Fresh Juice", price: 0, dietaryType: "veg", availabilityWindow: "7:00 AM - 10:30 AM" },
      { cat: "Breakfast", name: "Poha", price: 0, dietaryType: "veg", availabilityWindow: "7:00 AM - 10:30 AM" },
      { cat: "Breakfast", name: "Upma", price: 0, dietaryType: "veg", availabilityWindow: "7:00 AM - 10:30 AM" },
      { cat: "Breakfast", name: "Veg. Sandwich", price: 0, dietaryType: "veg", availabilityWindow: "7:00 AM - 10:30 AM" },
      { cat: "Breakfast", name: "Boiled Eggs", price: 0, dietaryType: "egg", availabilityWindow: "7:00 AM - 10:30 AM" },
      { cat: "Breakfast", name: "Omelette with cheese & veggies", price: 0, dietaryType: "egg", availabilityWindow: "7:00 AM - 10:30 AM" },
      { cat: "Breakfast", name: "Scrambled eggs", price: 0, dietaryType: "egg", availabilityWindow: "7:00 AM - 10:30 AM" },
      { cat: "Breakfast", name: "Bun Maska", price: 0, dietaryType: "veg", availabilityWindow: "7:00 AM - 10:30 AM" },
      { cat: "Breakfast", name: "Butter Toast", price: 0, dietaryType: "veg", availabilityWindow: "7:00 AM - 10:30 AM" },
      { cat: "Breakfast", name: "Jam Toast", price: 0, dietaryType: "veg", availabilityWindow: "7:00 AM - 10:30 AM" },
      { cat: "Breakfast", name: "Stuff Parathas", price: 0, dietaryType: "veg", availabilityWindow: "7:00 AM - 10:30 AM" },
      { cat: "Breakfast", name: "Aaloo Puri", price: 0, dietaryType: "veg", availabilityWindow: "7:00 AM - 10:30 AM" },
      { cat: "Breakfast", name: "Maggie", price: 0, dietaryType: "veg", availabilityWindow: "7:00 AM - 10:30 AM" },

      // MOCKTAIL
      { cat: "Mocktail", name: "Blue Angel", price: 175, description: "Blue Coracoa, Pineapple Juice, Lemonade", dietaryType: "veg" },
      { cat: "Mocktail", name: "Shirley Temple", price: 175, description: "Khus Syrup, Sprite, Soda", dietaryType: "veg" },
      { cat: "Mocktail", name: "Virgin Pina Colada", price: 175, description: "Pineapple Juice, Fresh Coconut Cream", dietaryType: "veg" },
      { cat: "Mocktail", name: "Virgin Mary", price: 175, description: "Tomato Juice, Tobasco, Lime, Worcestershire", dietaryType: "veg" },
      { cat: "Mocktail", name: "Ginger Ale", price: 175, description: "Fresh Ginger, Ginger Crush, Lime Juice", dietaryType: "veg" },
      { cat: "Mocktail", name: "Pulsated Punch", price: 175, description: "Pineapple, Orange Juice, Vanilla Ice", dietaryType: "veg" },
      { cat: "Mocktail", name: "Deep Blue Sea", price: 175, description: "Blue Curacao, Lemonade Sugar Syrup", dietaryType: "veg" },
      { cat: "Mocktail", name: "Green Valley", price: 175, description: "Khus Syrup, Pineapple Juice, Lime Juice", dietaryType: "veg" },
      { cat: "Mocktail", name: "Hawai Punch", price: 175, description: "Fresh Lime With Pineapple Juice", dietaryType: "veg" },
      { cat: "Mocktail", name: "Mango Thrust", price: 175, description: "Milk, Mango Crush, Mango Juice & Vanilla", dietaryType: "veg" },
      { cat: "Mocktail", name: "Orlando", price: 175, description: "Pineapple & Mango Juice, Orange, Strawberry Crush & Crushed Ice", dietaryType: "veg" },
      { cat: "Mocktail", name: "Kiss in the Dark", price: 149, description: "Cola with Ice Cream", dietaryType: "veg" },
      { cat: "Mocktail", name: "Lemon Ice Tea", price: 175, dietaryType: "veg" },

      // COFFEE & BEVERAGES
      { cat: "Coffee", name: "Expresso", price: 129, dietaryType: "veg" },
      { cat: "Coffee", name: "Americano", price: 129, dietaryType: "veg" },
      { cat: "Coffee", name: "Latte", price: 149, dietaryType: "veg" },
      { cat: "Coffee", name: "Cappuccino", price: 149, dietaryType: "veg" },
      { cat: "Coffee", name: "Mocha", price: 169, dietaryType: "veg" },
      { cat: "Coffee", name: "Hot Chocolate", price: 169, dietaryType: "veg" },
      { cat: "Cold Brews", name: "Classic Cold Coffee", price: 189, dietaryType: "veg" },
      { cat: "Cold Brews", name: "Iced Cappuccino", price: 189, dietaryType: "veg" },
      { cat: "Cold Brews", name: "Vanilla Frappe", price: 249, dietaryType: "veg" },
      { cat: "Cold Brews", name: "Hazelnut Frappe", price: 249, dietaryType: "veg" },
      { cat: "Cold Brews", name: "Caramel Frappe", price: 269, dietaryType: "veg" },
      { cat: "Teas", name: "Kadak Chai", price: 79, dietaryType: "veg" },
      { cat: "Teas", name: "Masala Tea", price: 79, dietaryType: "veg" },
      { cat: "Teas", name: "Green Tea", price: 69, dietaryType: "veg" },
      { cat: "Teas", name: "Lemon Tea", price: 69, dietaryType: "veg" },

      // MAGGI & STARTERS
      { cat: "Maggi", name: "Classic Masala Maggi", price: 89, dietaryType: "veg" },
      { cat: "Maggi", name: "Paneer Maggi", price: 129, dietaryType: "veg" },
      { cat: "Maggi", name: "Masala Fry Maggi", price: 119, dietaryType: "veg" },
      { cat: "Other Starters", name: "Salted French Fries", price: 149, dietaryType: "veg" },
      { cat: "Other Starters", name: "Peri-Peri Fries", price: 169, dietaryType: "veg" },
      { cat: "Other Starters", name: "Cheesy Fries", price: 199, dietaryType: "veg" },
      { cat: "Other Starters", name: "Cheese Balls", price: 225, dietaryType: "veg" },
      { cat: "Other Starters", name: "Bun Maska", price: 119, dietaryType: "veg" },
      { cat: "Other Starters", name: "Cheesy Nachos", price: 199, dietaryType: "veg" },
      { cat: "Other Starters", name: "Asorted Pakora", price: 265, dietaryType: "veg" },
      { cat: "Other Starters", name: "Paneer Pakora", price: 265, dietaryType: "veg" },
      { cat: "Other Starters", name: "Masala Sweet Corn", price: 149, dietaryType: "veg" },

      // PASTA (Veg & Non-Veg separated)
      { cat: "Pasta", name: "Alfredo Pasta (Veg)", price: 249, dietaryType: "veg" },
      { cat: "Pasta", name: "Alfredo Pasta (Non-Veg)", price: 269, dietaryType: "non-veg" },
      { cat: "Pasta", name: "Mixed Sauce Pasta (Veg)", price: 269, dietaryType: "veg" },
      { cat: "Pasta", name: "Mixed Sauce Pasta (Non-Veg)", price: 299, dietaryType: "non-veg" },
      { cat: "Pasta", name: "Arrabiata Pasta (Veg)", price: 249, dietaryType: "veg" },
      { cat: "Pasta", name: "Arrabiata Pasta (Non-Veg)", price: 269, dietaryType: "non-veg" },
      { cat: "Pasta", name: "Mac & Cheese (Veg)", price: 249, dietaryType: "veg" },
      { cat: "Pasta", name: "Mac & Cheese (Non-Veg)", price: 269, dietaryType: "non-veg" },

      // PIZZERIA & BREADS
      { cat: "Pizzeria", name: "Classic Margherita", price: 249, dietaryType: "veg" },
      { cat: "Pizzeria", name: "Veggie Delight", price: 289, dietaryType: "veg" },
      { cat: "Pizzeria", name: "Peppy Paneer Tikka", price: 299, dietaryType: "veg" },
      { cat: "Pizzeria", name: "Farmhouse", price: 299, dietaryType: "veg" },
      { cat: "Pizzeria", name: "Deluxe Veggie Pizza", price: 299, dietaryType: "veg" },
      { cat: "Garlic Bread", name: "Classic Garlic Bread", price: 129, unit: "6 pcs", dietaryType: "veg" },
      { cat: "Garlic Bread", name: "Cheesy Garlic Bread", price: 149, unit: "6 pcs", dietaryType: "veg" },
      { cat: "Garlic Bread", name: "Cheesy Corn Garlic Bread", price: 169, unit: "6 pcs", dietaryType: "veg" },

      // BURGERS & SANDWICHES
      { cat: "Burgers / Sandwiches", name: "Veg. Cheese Burger", price: 149, dietaryType: "veg" },
      { cat: "Burgers / Sandwiches", name: "Veg. Grilled Sandwich", price: 189, dietaryType: "veg" },
      { cat: "Burgers / Sandwiches", name: "Paneer Tikka Sandwich", price: 220, dietaryType: "veg" },
      { cat: "Burgers / Sandwiches", name: "Bombay Sandwich", price: 189, dietaryType: "veg" },
      { cat: "Burgers / Sandwiches", name: "Chilly Cheese Toast", price: 189, dietaryType: "veg" },
      { cat: "Burgers / Sandwiches", name: "Cheese Corn Spinach", price: 249, dietaryType: "veg" },
      { cat: "Burgers / Sandwiches", name: "Veg. Coleslaw Sandwich", price: 189, dietaryType: "veg" },

      // NOODLES & RICE
      { cat: "Noodles", name: "Hakka Noodles (V)", price: 225, dietaryType: "veg" },
      { cat: "Noodles", name: "Hakka Noodles (NV)", price: 255, dietaryType: "non-veg" },
      { cat: "Noodles", name: "Chilli Garlic Noodles (V)", price: 245, dietaryType: "veg" },
      { cat: "Noodles", name: "Chilli Garlic Noodles (NV)", price: 275, dietaryType: "non-veg" },
      { cat: "Noodles", name: "Pan Fried Noodles (V)", price: 245, dietaryType: "veg" },
      { cat: "Noodles", name: "Pan Fried Noodles (NV)", price: 275, dietaryType: "non-veg" },
      { cat: "Noodles", name: "Schezwan Noodles (V)", price: 245, dietaryType: "veg" },
      { cat: "Noodles", name: "Schezwan Noodles (NV)", price: 275, dietaryType: "non-veg" },
      { cat: "Noodles", name: "Street Style Chowmein (V)", price: 265, dietaryType: "veg" },
      { cat: "Noodles", name: "Street Style Chowmein (NV)", price: 295, dietaryType: "non-veg" },
      
      { cat: "Rice", name: "Fried Rice (V)", price: 225, dietaryType: "veg" },
      { cat: "Rice", name: "Fried Rice (NV)", price: 255, dietaryType: "non-veg" },
      { cat: "Rice", name: "Paneer Fried Rice", price: 245, dietaryType: "veg" },
      { cat: "Rice", name: "Chilli Garlic Fried Rice (V)", price: 245, dietaryType: "veg" },
      { cat: "Rice", name: "Chilli Garlic Fried Rice (NV)", price: 275, dietaryType: "non-veg" },
      { cat: "Rice", name: "Egg Fried Rice", price: 245, dietaryType: "egg" },
      { cat: "Rice", name: "Egg Chilli Garlic Fried Rice", price: 269, dietaryType: "egg" },

      // CHINESE MAIN COURSE & SIDES
      { cat: "Chinese Main Course", name: "Chilli Paneer Gravy/Dry", price: 225, dietaryType: "veg" },
      { cat: "Chinese Main Course", name: "Paneer In Schezwan Sauce", price: 245, dietaryType: "veg" },
      { cat: "Chinese Main Course", name: "Manchurian Dry/Gravy (V)", price: 245, dietaryType: "veg" },
      { cat: "Chinese Main Course", name: "Vegetable in Schezwan Sauce", price: 225, dietaryType: "veg" },
      
      { cat: "Sides", name: "Spring Roll", price: 219, dietaryType: "veg" },
      { cat: "Sides", name: "Crispy Corn Salt & Pepper", price: 245, dietaryType: "veg" },
      { cat: "Sides", name: "Cheese Cigar Rolls", price: 249, dietaryType: "veg" },
      { cat: "Sides", name: "Honey Chilli Potato", price: 219, dietaryType: "veg" },
      { cat: "Sides", name: "Chilli Mushroom Dry", price: 229, dietaryType: "veg" },
      { cat: "Sides", name: "Crispy Vegetable", price: 229, dietaryType: "veg" },
      { cat: "Sides", name: "Paneer 65", price: 245, dietaryType: "veg" },
      { cat: "Sides", name: "Drums of Heaven", price: 295, dietaryType: "non-veg" },

      // SOUPS
      { cat: "Soup Bowls", name: "Manchow Soup (Veg)", price: 149, dietaryType: "veg" },
      { cat: "Soup Bowls", name: "Manchow Soup (Non-Veg)", price: 199, dietaryType: "non-veg" },
      { cat: "Soup Bowls", name: "Clear Soup (Veg)", price: 149, dietaryType: "veg" },
      { cat: "Soup Bowls", name: "Clear Soup (Non-Veg)", price: 199, dietaryType: "non-veg" },
      { cat: "Soup Bowls", name: "Hot & Sour Soup (Veg)", price: 149, dietaryType: "veg" },
      { cat: "Soup Bowls", name: "Hot & Sour Soup (Non-Veg)", price: 199, dietaryType: "non-veg" },
      { cat: "Soup Bowls", name: "Lemon Coriander Soup (Veg)", price: 149, dietaryType: "veg" },
      { cat: "Soup Bowls", name: "Lemon Coriander Soup (Non-Veg)", price: 199, dietaryType: "non-veg" },
      { cat: "Soup Bowls", name: "Burnt Garlic Mushroom Soup (Veg)", price: 149, dietaryType: "veg" },
      { cat: "Soup Bowls", name: "Burnt Garlic Mushroom Soup (Non-Veg)", price: 199, dietaryType: "non-veg" },
      { cat: "Soup Bowls", name: "Cream of Tomatto Soup", price: 149, dietaryType: "veg" },

      // INDIAN MAIN COURSE & TANDOORI
      { cat: "Tandoori Snacks", name: "Paneer Tikka", price: 289, dietaryType: "veg" },
      { cat: "Tandoori Snacks", name: "Malai Paneer Tikka", price: 299, dietaryType: "veg" },
      { cat: "Tandoori Snacks", name: "Hara Bhara Kebab", price: 249, dietaryType: "veg" },
      { cat: "Tandoori Snacks", name: "Veg Seekh Kebab", price: 249, dietaryType: "veg" },
      { cat: "Tandoori Snacks", name: "Tandoori Mushroom", price: 269, dietaryType: "veg" },
      { cat: "Tandoori Snacks", name: "Tandoori Aloo", price: 249, dietaryType: "veg" },
      
      { cat: "Indian Main Course", name: "Dal Fry / Tadka", price: 229, dietaryType: "veg" },
      { cat: "Indian Main Course", name: "Aloo Jeera", price: 199, dietaryType: "veg" },
      { cat: "Indian Main Course", name: "Mixed Vegetable", price: 249, dietaryType: "veg" },
      { cat: "Indian Main Course", name: "Kashmiri Dum Aloo", price: 249, dietaryType: "veg" },
      { cat: "Indian Main Course", name: "Banarasi Dum Aloo", price: 269, dietaryType: "veg" },
      { cat: "Indian Main Course", name: "Mushroom Matar", price: 259, dietaryType: "veg" },
      { cat: "Indian Main Course", name: "Mushroom Masala", price: 269, dietaryType: "veg" },
      { cat: "Indian Main Course", name: "Dal Makhani", price: 289, dietaryType: "veg" },
      { cat: "Indian Main Course", name: "Malai Kofta", price: 349, dietaryType: "veg" },
      { cat: "Indian Main Course", name: "Navratan Korma", price: 369, dietaryType: "veg" },
      { cat: "Indian Main Course", name: "Paneer Butter Masala", price: 329, dietaryType: "veg" },
      { cat: "Indian Main Course", name: "Kadhai Paneer", price: 299, dietaryType: "veg" },
      { cat: "Indian Main Course", name: "Paneer Do Pyaza", price: 299, dietaryType: "veg" },
      { cat: "Indian Main Course", name: "Amritsari paneer Bhurji", price: 329, dietaryType: "veg" },
      { cat: "Indian Main Course", name: "Paneer Lababdar", price: 349, dietaryType: "veg" },
      { cat: "Indian Main Course", name: "Sahi Paneer", price: 349, dietaryType: "veg" },
      { cat: "Indian Main Course", name: "Paneer Tikka Masala", price: 349, dietaryType: "veg" },
      { cat: "Indian Main Course", name: "Mutter Paneer", price: 269, dietaryType: "veg" },
      { cat: "Indian Main Course", name: "Palak Paneer", price: 289, dietaryType: "veg" },
      { cat: "Indian Main Course", name: "Paneer Kali Mirch", price: 349, dietaryType: "veg" },
      { cat: "Indian Main Course", name: "Kaju Korma", price: 349, dietaryType: "veg" },
      { cat: "Indian Main Course", name: "Egg Curry", price: 269, dietaryType: "egg" },
      { cat: "Indian Main Course", name: "Egg Bhurji", price: 249, dietaryType: "egg" },

      // INDIAN BREADS
      { cat: "Indian Breads", name: "Tawa Roti", price: 29, dietaryType: "veg" },
      { cat: "Indian Breads", name: "Tandoori Roti", price: 39, dietaryType: "veg" },
      { cat: "Indian Breads", name: "Butter Tandoori Roti", price: 49, dietaryType: "veg" },
      { cat: "Indian Breads", name: "Plain Naan", price: 79, dietaryType: "veg" },
      { cat: "Indian Breads", name: "Butter Naan", price: 89, dietaryType: "veg" },
      { cat: "Indian Breads", name: "Laccha Parantha", price: 79, dietaryType: "veg" },
      { cat: "Indian Breads", name: "Garlic Naan", price: 119, dietaryType: "veg" },
      { cat: "Indian Breads", name: "Stuffed Naan", price: 129, dietaryType: "veg" },
      { cat: "Indian Breads", name: "Missi Roti", price: 79, dietaryType: "veg" },
      { cat: "Indian Breads", name: "Mirchi Paratha", price: 89, dietaryType: "veg" },
      { cat: "Indian Breads", name: "Pudina Laccha Parantha", price: 89, dietaryType: "veg" },

      // ACCOMPANIMENTS, MITHAI & ICE CREAM
      { cat: "Salads & Raita", name: "Kachamber Salad", price: 99, dietaryType: "veg" },
      { cat: "Salads & Raita", name: "Green Salad", price: 99, dietaryType: "veg" },
      { cat: "Salads & Raita", name: "Roasted Papad", price: 69, dietaryType: "veg" },
      { cat: "Salads & Raita", name: "Masala Papad", price: 99, dietaryType: "veg" },
      { cat: "Salads & Raita", name: "Boondi Raita", price: 119, dietaryType: "veg" },
      { cat: "Salads & Raita", name: "Pineapple Raita", price: 129, dietaryType: "veg" },
      
      { cat: "Mithai & Meetha", name: "Gulab Jamun", price: 99, unit: "2 pcs", dietaryType: "veg" },
      { cat: "Mithai & Meetha", name: "Rasmalai", price: 129, unit: "2 pcs", dietaryType: "veg" },
      { cat: "Mithai & Meetha", name: "Rabri", price: 149, dietaryType: "veg" },
      { cat: "Mithai & Meetha", name: "Gajar Ka Halwa", price: 169, dietaryType: "veg" },
      { cat: "Mithai & Meetha", name: "Moong Daal Halwa", price: 199, dietaryType: "veg" },

      { cat: "Ice Cream & Sundaes", name: "Vanilla", price: 59, unit: "scoop", dietaryType: "veg" },
      { cat: "Ice Cream & Sundaes", name: "Chocolate", price: 59, unit: "scoop", dietaryType: "veg" },
      { cat: "Ice Cream & Sundaes", name: "Strawberry", price: 59, unit: "scoop", dietaryType: "veg" },
      { cat: "Ice Cream & Sundaes", name: "Butterscotch", price: 59, unit: "scoop", dietaryType: "veg" },
      { cat: "Ice Cream & Sundaes", name: "Kesar Pista", price: 59, unit: "scoop", dietaryType: "veg" },
      { cat: "Ice Cream & Sundaes", name: "Brownie Sundae", price: 199, dietaryType: "veg" },
      { cat: "Ice Cream & Sundaes", name: "Double Sundae", price: 249, dietaryType: "veg" },
    ];

    // Insert the menu items using the generated category IDs
    for (const item of banquetMenuItems) {
      const categoryId = categoryIdMap.get(item.cat);
      if (!categoryId) {
        throw new Error(`Category ID not found for ${item.cat}`);
      }

      await ctx.db.insert("banquetMenuItems", {
        categoryId,
        name: item.name,
        price: item.price,
        description: item.description,
        unit: item.unit,
        dietaryType: item.dietaryType as "veg" | "non-veg" | "egg",
        availabilityWindow: item.availabilityWindow,
        isAvailable: true, // Defaulting everything to available
      });
    }

    return "Menu seeded successfully!";
  },
});