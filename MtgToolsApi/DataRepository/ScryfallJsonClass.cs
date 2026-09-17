using System.Text.Json.Serialization;

namespace MtgToolsApi.DataRepository;

public static class ScryfallJsonClass
{
    public class Card
    {
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;
        [JsonPropertyName("printed_name")]
        public string PrintedName { get; set; } = string.Empty;
        [JsonPropertyName("type_line")]
        public string TypeLine { get; set; } = string.Empty;
        [JsonPropertyName("colors")]
        public string[] Colors { get; set; } = [];
        [JsonPropertyName("color_identity")]
        public string[] ColorIdentity { get; set; } = [];

        [JsonPropertyName("card_faces")] 
        public CardFaces[] CardFacesArray { get; set; } = [];
        [JsonPropertyName("layout")] 
        public string Layout { get; set; } = string.Empty;
        [JsonPropertyName("game_changer")] 
        public bool IsGameChanger { get; set; } = false;

    }
    // public class Card
    // {
    //     public string id { get; set; } = string.Empty;
    //     public string oracle_id { get; set; }
    //     public object[] multiverse_ids { get; set; }
    //     public string name { get; set; }
    //     public string lang { get; set; }
    //     public string released_at { get; set; }
    //     public string uri { get; set; }
    //     public string scryfall_uri { get; set; }
    //     public string layout { get; set; }
    //     public bool highres_image { get; set; }
    //     public string image_status { get; set; }
    //     public double cmc { get; set; }
    //     public string type_line { get; set; }
    //     public string[] colors { get; set; }
    //     public object[] color_identity { get; set; }
    //     public object[] keywords { get; set; }
    //     public Card_faces[] card_faces { get; set; }
    //     public Legalities legalities { get; set; }
    //     public string[] games { get; set; }
    //     public bool reserved { get; set; }
    //     public bool game_changer { get; set; }
    //     public bool foil { get; set; }
    //     public bool nonfoil { get; set; }
    //     public string[] finishes { get; set; }
    //     public bool oversized { get; set; }
    //     public bool promo { get; set; }
    //     public bool reprint { get; set; }
    //     public bool variation { get; set; }
    //     [JsonPropertyName("set_id")]
    //     public string SetId { get; set; }
    //     [JsonPropertyName("set")]
    //     public string CardSet { get; set; }
    //     [JsonPropertyName("set_name")]
    //     public string SetName { get; set; }
    //     public string set_type { get; set; }
    //     [JsonPropertyName("set_uri")]
    //     public string SetUri { get; set; }
    //     public string set_search_uri { get; set; }
    //     public string scryfall_set_uri { get; set; }
    //     public string rulings_uri { get; set; }
    //     public string prints_search_uri { get; set; }
    //     public string collector_number { get; set; }
    //     public bool digital { get; set; }
    //     public string rarity { get; set; }
    //     public string artist { get; set; }
    //     public string[] artist_ids { get; set; }
    //     public string border_color { get; set; }
    //     public string frame { get; set; }
    //     public bool full_art { get; set; }
    //     public bool textless { get; set; }
    //     public bool booster { get; set; }
    //     public bool story_spotlight { get; set; }
    //     public Prices prices { get; set; }
    //     public Related_uris related_uris { get; set; }
    //     public Purchase_uris purchase_uris { get; set; }
    // }

    public class CardFaces
    {
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;
        [JsonPropertyName("printed_name")]
        public string PrintedName { get; set; } = string.Empty;
        [JsonPropertyName("type_line")]
        public string TypeLine { get; set; } = string.Empty;
        [JsonPropertyName("colors")]
        public string[] Colors { get; set; } = [];
        //public string mana_cost { get; set; }
        //public string oracle_text { get; set; }
        //public string[] colors { get; set; }
        //public string artist { get; set; }
        //public string artist_id { get; set; }
        //public string illustration_id { get; set; }
        //public Image_uris image_uris { get; set; }
    }

    // public class Image_uris
    // {
    //     public string small { get; set; }
    //     public string normal { get; set; }
    //     public string large { get; set; }
    //     public string png { get; set; }
    //     public string art_crop { get; set; }
    //     public string border_crop { get; set; }
    // }

    // public class Legalities
    // {
    //     public string standard { get; set; }
    //     public string future { get; set; }
    //     public string historic { get; set; }
    //     public string timeless { get; set; }
    //     public string gladiator { get; set; }
    //     public string pioneer { get; set; }
    //     public string modern { get; set; }
    //     public string legacy { get; set; }
    //     public string pauper { get; set; }
    //     public string vintage { get; set; }
    //     public string penny { get; set; }
    //     public string commander { get; set; }
    //     public string oathbreaker { get; set; }
    //     public string standardbrawl { get; set; }
    //     public string brawl { get; set; }
    //     public string alchemy { get; set; }
    //     public string paupercommander { get; set; }
    //     public string duel { get; set; }
    //     public string oldschool { get; set; }
    //     public string premodern { get; set; }
    //     public string predh { get; set; }
    // }
    //
    // public class Prices
    // {
    //     public object usd { get; set; }
    //     public object usd_foil { get; set; }
    //     public object usd_etched { get; set; }
    //     public object eur { get; set; }
    //     public object eur_foil { get; set; }
    //     public object tix { get; set; }
    // }
    //
    // public class Related_uris
    // {
    //     public string tcgplayer_infinite_articles { get; set; }
    //     public string tcgplayer_infinite_decks { get; set; }
    //     public string edhrec { get; set; }
    // }
    //
    // public class Purchase_uris
    // {
    //     public string tcgplayer { get; set; }
    //     public string cardmarket { get; set; }
    //     public string cardhoarder { get; set; }
    // }
    
    public class BulkDataParent
    {
        [JsonPropertyName("object")] 
        public required string  ObjectType {get; set; }
        [JsonPropertyName("has_more")] 
        public bool HasMore { get; set; }
        [JsonPropertyName("data")] 
        public List<BulkData>? Data { get; set; }
    }

    public class BulkData
    {
        [JsonPropertyName("id")] 
        public required string Id { get; set; }
        [JsonPropertyName("type")] 
        public required string Type { get; set; }
        [JsonPropertyName("updated_at")] 
        public required string UpdatedAt { get; set; }
        [JsonPropertyName("uri")] 
        public required string Uri { get; set; }
        [JsonPropertyName("name")] 
        public required string Name { get; set; }
        [JsonPropertyName("description")] 
        public required string Description { get; set; }
        [JsonPropertyName("size")] 
        public required Int64 Size { get; set; }
        [JsonPropertyName("download_uri")] 
        public required string DownloadUri { get; set; }
        [JsonPropertyName("content_type")] 
        public required string ContentType { get; set; }
        [JsonPropertyName("content_encoding")] 
        public required string ContentEncoding { get; set; }
    }
}