const Book = require("../models/book");
const User = require("../models/user");
const BookCopy = require("../models/bookCopy");

var getAllBooks = (req, res) => {
    //TODO: access all books from the book model and render book list page
    Book.find({}, (err, foundBooks) => {
        if (err) {
            console.log(err);
        } else {
            res.render("book_list", { books: foundBooks, title: "Books | Library" });
        }
    })
}

var getBook = (req, res) => {
    //TODO: access the book with a given id and render book detail page
    const id = req.params.id;

    Book.findById(id, (err, foundBook) => {
        if (err) {
            console.log(err);
        } else {
            // console.log(id, foundBook)
            res.render("book_detail", { book: foundBook, title: "Book Details" });
        }
    })
}

var getLoanedBooks = (req, res) => {
    //TODO: access the books loaned for this user and render loaned books page
    const user = req.user;

    User.findById(user.id)
        .populate({ path: "loaned_books", populate: { path: "book" }})
        .then(copies => {
            const books = copies.loaned_books;
            res.render("loaned_books", { books: books, title: "Loaned Books" })
        })
        .catch(err => {
            console.log(err);
        });
}


var issueBook = (req, res) => {
    // TODO: Extract necessary book details from request
    // return with appropriate status
    // Optionally redirect to page or display on same
    const { user, body } = req;    

    Book.findById(body.bid, (err, foundBook) => {
        if (err) {
            console.log(err);
        } else {
            var availableCopies = foundBook.available_copies;
            console.log(availableCopies);
            BookCopy.find({ book: body.bid }, (err, bookCopies) => {
                if (err) {
                    console.log(err);
                } else {
                    for(var bookCopy of bookCopies){
                        if (availableCopies && bookCopy.status) {
                            User.findByIdAndUpdate(user.id, { $addToSet: { loaned_books: [bookCopy.id] } }, (err, result) => {
                                if (err) {
                                    console.log(err);
                                } else {
                                    console.log("Successfully added book to the list of loaned books!");
                                }
                            });
                            BookCopy.findByIdAndUpdate(bookCopy.id, { $set: { status: false, borrow_data: Date.now(), borrower: user.id } }, (err, result) => {
                                if (err) {
                                    console.log(err);
                                } else {
                                    console.log("Successfully updated documents in BookCopy collection!");
                                }
                            });
                            availableCopies -= 1;
                            Book.findByIdAndUpdate(bookCopy.book, { $set: { available_copies: availableCopies } }, (err, result) => {
                                if (err) {
                                    console.log(err);
                                } else {
                                    console.log("Successfully updated documents in Book collection!");
                                    res.redirect(`/book/${body.bid}`);
                                }
                            });
                            break;
                        }
                    }
                }
            });
        }
    });
}

var searchBooks = (req, res) => {
    // TODO: extract search details
    // query book model on these details
    // render page with the above details
    const { title, author, genre } = req.body;

    Book.find({ title: { $regex: title, $options: "i" }, author: { $regex: author, $options: "i" }, genre: { $regex: genre, $options: "i"} }, (err, foundBooks) => {
        if (err) {
            console.log(err);
        } else {
            res.render("book_list", { books: foundBooks, title: "Books | Library" });
        }
    })
}

var returnBook = (req, res) => {
    //Return issued book
    const bookCopyId = req.params.bc_id;
    const userId = req.user.id;

    BookCopy.findByIdAndUpdate(bookCopyId, { $set: { status: true, borrow_data: undefined, borrower: undefined } })
        .then(bookcopy => {
            const bookId = bookcopy.book;
            // console.log("bookId:", bookId);
            console.log("Successfully updated bookcopy schema!");

            User.findByIdAndUpdate(userId, { $pull: { loaned_books: bookCopyId } }, (err, result) => {
                if (err) {
                    console.log(err);
                } else {
                    console.log("Successfully removed bookcopy from user data!");
                }
            });
            Book.findByIdAndUpdate(bookId, { $inc: { available_copies: 1 } }, (err, result) => {
                if (err) {
                    console.log(err);
                } else {
                    console.log("Successfully updated book details!");
                    res.redirect("/books/loaned");
                }
            });
        })
        .catch(err => {
            console.log(err);
        });
}

module.exports = {
    getAllBooks,
    getBook,
    getLoanedBooks,
    issueBook,
    searchBooks,
    returnBook
}