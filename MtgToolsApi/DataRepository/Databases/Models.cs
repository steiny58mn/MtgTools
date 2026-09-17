using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MtgToolsApi.DataRepository.Databases;

public class Models
{
    [Table("Cards")]
    public class Card
    {
        [Key]
        public int CardId { get; set; }
        public required string Name { get; set; }
        public required string PrintedName { get; set; }
        public required string Type { get; set; }
        public required string Colors { get; set; }
        public required string ColorIdentity { get; set; }
        public required bool IsGameChanger { get; set; }
    }
    [Table("BulkData")]
    public class BulkData
    {
        [Key]
        public int BulkDataId { get; set; }
        public required string ScryfallId { get; set; }
        public required string Type { get; set; }
        public required DateTime UpdatedAt { get; set; }
        public required string Uri { get; set; }
        public required string Name { get; set; }
        public required string Description { get; set; }
        public required int Size { get; set; }
        public required string DownloadUri { get; set; }
    }

    [Table("Logs")]
    public class Logs
    {
        [Key]
        public int LogId { get; set; }
        public required string LogMessage { get; set; }
        public DateTime LoggedAt { get; set; }
    }
}