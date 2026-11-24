
$(document).ready(function () {

    // =====================================
    // APPLICATION VARIABLES
    // =====================================

    const API_URL = "https://openlibrary.org";

    const RESULTS_PER_PAGE = 10;
    const MAX_RESULTS = 50;

    let searchResults = [];
    let collectionBooks = [];
    let currentPage = 1;
    let totalPages = 1;
    let currentView = "grid";
    let currentSearchTerm = "";

    // =====================================
    // MUSTACHE TEMPLATES
    // =====================================

    const bookTemplate = $("#book-template").html();
    const detailsTemplate = $("#details-template").html();

    // =====================================
    // HELPER FUNCTIONS
    // =====================================

    function getCoverUrl(coverId) {
        if (!coverId) {
            return "";
        }

        return "https://covers.openlibrary.org/b/id/" +
            encodeURIComponent(coverId) + "-L.jpg";
    }

    function getWorkId(key) {
        if (!key) {
            return "";
        }

        return key.split("/").filter(Boolean).pop();
    }

    function showStatus(element, message, isError = false) {
        $(element)
            .text(message)
            .toggleClass("error", isError)
            .removeClass("hidden");
    }

    function hideStatus(element) {
        $(element).empty().removeClass("error");
    }

    // =====================================
    // NAVIGATION BETWEEN SECTIONS
    // =====================================

    $(".nav-btn").on("click", function () {

        const section = $(this).data("section");

        $(".nav-btn").removeClass("active");
        $(this).addClass("active");

        $(".content-section").addClass("hidden");
        $("#" + section).removeClass("hidden");

        // Keep the currently selected book details visible.
    });

    // =====================================
    // SEARCH BOOKS USING OPEN LIBRARY
    // =====================================

    $("#search-form").on("submit", function (event) {

        event.preventDefault();

        const searchTerm = $("#search-input").val().trim();

        if (!searchTerm) {
            return;
        }

        currentSearchTerm = searchTerm;
        currentPage = 1;

        searchBooks();
    });

    function searchBooks() {

        showStatus("#search-status", "Searching Open Library...");
        $("#search-results").empty();
        $("#pagination").empty();
        $("#result-count").text("Loading search results...");

        const searchUrl = API_URL + "/search.json?q=" +
            encodeURIComponent(currentSearchTerm) +
            "&limit=" + MAX_RESULTS +
            "&page=1";

        $.ajax({
            url: searchUrl,
            method: "GET",
            dataType: "json",

            success: function (data) {

                searchResults = (data.docs || []).slice(0, MAX_RESULTS);

                totalPages = Math.max(
                    1,
                    Math.ceil(searchResults.length / RESULTS_PER_PAGE)
                );

                if (searchResults.length === 0) {
                    showStatus(
                        "#search-status",
                        "No books were found. Try another search."
                    );

                    $("#result-count").text("0 books found.");
                    return;
                }

                hideStatus("#search-status");

                $("#result-count").text(
                    searchResults.length +
                    " books found for '" + currentSearchTerm + "'"
                );

                renderSearchResults();
            },

            error: function () {

                showStatus(
                    "#search-status",
                    "Unable to retrieve books. Please try again.",
                    true
                );

                $("#result-count").text("Search unavailable.");
            }
        });
    }

    // =====================================
    // FORMAT BOOK DATA FOR MUSTACHE
    // =====================================

    function formatBook(book) {

        const author = Array.isArray(book.author_name)
            ? book.author_name.join(", ")
            : "Author information unavailable";

        return {
            title: book.title || "Untitled Book",
            author: author,
            year: book.first_publish_year || "",
            editionCount: book.edition_count || "",
            coverUrl: getCoverUrl(book.cover_i),
            workId: getWorkId(book.key)
        };
    }

    // =====================================
    // RENDER SEARCH RESULTS
    // =====================================

    function renderSearchResults() {

        const start = (currentPage - 1) * RESULTS_PER_PAGE;
        const end = start + RESULTS_PER_PAGE;

        const currentBooks = searchResults.slice(start, end);

        let html = "";

        currentBooks.forEach(function (book) {

            const formattedBook = formatBook(book);

            html += Mustache.render(bookTemplate, formattedBook);
        });

        $("#search-results")
            .html(html)
            .toggleClass("list-view", currentView === "list");

        renderPagination();
    }

    // =====================================
    // PAGINATION
    // =====================================

    function renderPagination() {

        const pagination = $("#pagination");

        pagination.empty();

        if (searchResults.length <= RESULTS_PER_PAGE) {
            return;
        }

        const previousButton = $("<button>")
            .text("← Previous")
            .prop("disabled", currentPage === 1)
            .on("click", function () {
                if (currentPage > 1) {
                    currentPage--;
                    renderSearchResults();
                }
            });

        const pageLabel = $("<span>")
            .text("Page " + currentPage + " of " + totalPages);

        const nextButton = $("<button>")
            .text("Next →")
            .prop("disabled", currentPage === totalPages)
            .on("click", function () {
                if (currentPage < totalPages) {
                    currentPage++;
                    renderSearchResults();
                }
            });

        pagination.append(
            previousButton,
            pageLabel,
            nextButton
        );
    }

    // =====================================
    // GRID AND LIST VIEW
    // =====================================

    $(".view-btn").on("click", function () {

        currentView = $(this).data("view");

        const section = $(this).closest(".content-section");

        section.find(".view-btn").removeClass("active");

        $(this).addClass("active");

        if (section.attr("id") === "search-section") {

            $("#search-results").toggleClass(
                "list-view",
                currentView === "list"
            );

        } else {

            $("#collection-results").toggleClass(
                "list-view",
                currentView === "list"
            );
        }
    });

    // =====================================
    // LOAD SCIENCE FICTION COLLECTION
    // =====================================

    function loadCollection() {

        showStatus(
            "#collection-status",
            "Loading Science Fiction books..."
        );

        $.ajax({

            url: API_URL + "/subjects/science_fiction.json?limit=10",
            method: "GET",
            dataType: "json",

            success: function (data) {

                collectionBooks = (data.works || []).slice(0, 10);

                if (collectionBooks.length === 0) {

                    showStatus(
                        "#collection-status",
                        "No books are currently available in this collection."
                    );

                    return;
                }

                hideStatus("#collection-status");

                renderCollection();
            },

            error: function () {

                showStatus(
                    "#collection-status",
                    "Unable to load the Science Fiction collection. Please try again.",
                    true
                );
            }
        });
    }

    // =====================================
    // RENDER PREDEFINED COLLECTION
    // =====================================

    function renderCollection() {

        let html = "";

        collectionBooks.forEach(function (book) {

            const formattedBook = {
                title: book.title || "Untitled Book",

                author: Array.isArray(book.authors) &&
                    book.authors.length
                    ? book.authors.map(function (author) {
                        return author.name;
                    }).join(", ")
                    : "Author information unavailable",

                year: book.first_publish_year || "",
                editionCount: "",
                coverUrl: getCoverUrl(book.cover_id),
                workId: getWorkId(book.key)
            };

            html += Mustache.render(bookTemplate, formattedBook);
        });

        $("#collection-results")
            .html(html)
            .toggleClass("list-view", currentView === "list");
    }

    // =====================================
    // SELECT A BOOK AND DISPLAY DETAILS
    // =====================================

    $(document).on("click", ".details-btn", function () {

        const workId = $(this).attr("data-work-key");

        if (!workId) {
            return;
        }

        loadBookDetails(workId);
    });

    function loadBookDetails(workId) {

        $("#details-section").removeClass("hidden");

        $("#book-details").html(
            '<div class="status">Loading book details...</div>'
        );

        // Scroll to the details section without reloading.
        document.getElementById("details-section").scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

        $.ajax({

            url: API_URL + "/works/" +
                encodeURIComponent(workId) + ".json",

            method: "GET",
            dataType: "json",

            success: function (data) {

                const authorRequests = (data.authors || [])
                    .slice(0, 10)
                    .map(function (author) {

                        const authorKey = author.author &&
                            author.author.key;

                        if (!authorKey) {
                            return $.Deferred().resolve(null).promise();
                        }

                        return $.ajax({
                            url: API_URL + authorKey + ".json",
                            method: "GET",
                            dataType: "json"
                        }).catch(function () {
                            return null;
                        });
                    });

                Promise.all(authorRequests).then(function (authors) {

                    const authorNames = authors
                        .filter(function (author) {
                            return author && author.name;
                        })
                        .map(function (author) {
                            return author.name;
                        });

                    const description = typeof data.description === "string"
                        ? data.description
                        : data.description && data.description.value
                            ? data.description.value
                            : "Description is not available for this book.";

                    const subjects = (data.subjects || []).slice(0, 10);

                    const languages = (data.languages || [])
                        .map(function (language) {
                            return getWorkId(language.key) || language.key;
                        })
                        .filter(Boolean)
                        .join(", ");

                    const details = {

                        title: data.title || "Untitled Book",

                        workId: workId,

                        authors: authorNames.length
                            ? authorNames.join(", ")
                            : "Author information unavailable.",

                        description: description,

                        subjects: subjects,

                        coverUrl: getCoverUrl(
                            data.covers && data.covers.length
                                ? data.covers[0]
                                : null
                        ),

                        publishDate: data.first_publish_date || "",

                        languages: languages,

                        revision: data.revision || "",

                        openLibraryUrl:
                            "https://openlibrary.org/works/" +
                            encodeURIComponent(workId)
                    };

                    const html = Mustache.render(
                        detailsTemplate,
                        details
                    );

                    $("#book-details").html(html);

                }).catch(function () {

                    showStatus(
                        "#book-details",
                        "Unable to display the selected book's information.",
                        true
                    );

                });
            },

            error: function () {

                showStatus(
                    "#book-details",
                    "Unable to retrieve this book's details. Please try another book.",
                    true
                );
            }
        });
    }

    // =====================================
    // CLOSE BOOK DETAILS
    // =====================================

    $("#close-details").on("click", function () {

        $("#details-section").addClass("hidden");
        $("#book-details").empty();
    });

    // =====================================
    // INITIALIZE APPLICATION
    // =====================================

    loadCollection();

});
