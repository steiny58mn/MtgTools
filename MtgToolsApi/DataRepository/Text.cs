namespace MtgToolsApi.DataRepository;

public class Text
{
    public required string PastedText { get; set; }
    public required string ExistingText { get; set; }
    public int CursorPosition { get; set; }
}